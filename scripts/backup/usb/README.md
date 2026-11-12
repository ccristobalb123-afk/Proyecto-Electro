# Copia semanal automática al USB cifrado

Conectas el USB (32 GB, LUKS2 + ext4) y, sin escribir nada, el servidor copia
el respaldo más reciente de `~/backups/electrosac`, lo verifica leyéndolo desde
el USB, desmonta, cierra y avisa de que ya puedes retirarlo. Si el USB se
pierde, no se puede leer sin tu frase de contraseña o sin el archivo-llave del
servidor.

| Archivo | Qué es | Se instala en |
|---|---|---|
| `respaldo-usb.conf` | Configuración: usuario, UUID, rutas, retención, avisos | `/etc/respaldo-usb.conf` (root, 644) |
| `respaldo-usb.sh` | Script principal (abrir → montar → copiar → verificar → rotar → cerrar → avisar) | `/usr/local/sbin/respaldo-usb.sh` (root, 755) |
| `respaldo-usb.service` | Unidad systemd *oneshot* que ejecuta el script como root | `/etc/systemd/system/` |
| `99-respaldo-usb.rules` | Plantilla de la regla udev (detecta ESTE USB por UUID) | `/etc/udev/rules.d/` (con el UUID sustituido) |
| `comprobar-usb.sh` | «Hace N días que no se copia al USB» (se queda en el repo; lo usa `backup.sh`) | — |
| `pruebas/pruebas-usb.sh` | Pruebas sin root con carpetas temporales (ver el final) | — |

Los archivos se **copian** a rutas de sistema propiedad de root: así un
proceso con tu usuario no puede cambiar lo que systemd ejecuta como root. Si
cambias algo en el repositorio, repite el paso e).

## Cómo funciona

1. **Detección.** La regla udev reconoce la partición LUKS por su UUID (no por
   `/dev/sdX`). Marca el dispositivo con `UDISKS_IGNORE=1` (también el
   descifrado), para que el escritorio no pida la frase ni lo monte, y le
   pide a systemd que arranque `respaldo-usb.service`. udev no hace nada más.
2. **Apertura.** `cryptsetup open` con el archivo-llave, `fsck.ext4 -p` (por si
   se retiró sin cerrar) y montaje en `/mnt/respaldo-usb`
   (`nodev,nosuid,noexec`).
3. **Qué copia.** Solo el respaldo más reciente por la fecha de su nombre,
   entre `diarios/` y `semanales/`: su `.sql.gz`, su `.uploads.tar.gz` y su
   `.sha256`. Lo copia a `respaldos-electrosac/AAAA-MM-DD_HHMMSS/`. Si ya
   está en el USB (por ejemplo, porque lo conectas dos veces el mismo día), no
   copia nada.
   - Uso la fecha **y la hora** del respaldo en el nombre de la carpeta, no
     solo la fecha: si un día hay dos respaldos, el segundo no pisa al
     primero ya verificado.
   - Los semanales se copian con el nombre del diario, que es el que figura
     dentro de su `.sha256`.
4. **Antes de copiar.**
   - Comprueba el respaldo de origen con su `.sha256`.
   - Comprueba que, después de copiar, quede al menos un 10 %
     (`MIN_LIBRE_PCT`) libre. Si no, no copia y registra el error.
5. **Copia y verificación.**
   - Copia a `respaldos-electrosac/.en-curso-…`.
   - Hace `sync`, desmonta y vuelve a montar en solo lectura. Así la
     verificación lee del USB y no de la caché del kernel.
   - Pasa `sha256sum -c` y `gzip -t` a los dos `.gz`.
6. **Solo si todo da OK.**
   - Renombra la carpeta a su nombre definitivo.
   - Aplica la retención: quedan las `COPIAS_A_CONSERVAR` (5) copias más
     recientes, y la más antigua se borra solo ahora.
   - Actualiza la marca `~/backups/electrosac/USB_ULTIMA_COPIA`.
   - Si algo falla, no se borra ninguna copia anterior. La carpeta
     `.en-curso-…` se elimina; si no se pudo (por ejemplo, porque retiraste el
     USB), se elimina en la siguiente conexión.
7. **Siempre**, también si falla, si retiras el USB a mitad o si se detiene el
   servicio, un `trap` desmonta y hace `cryptsetup close`. La próxima
   conexión vuelve a empezar desde cero.
8. **Avisos al terminar.** Ver la siguiente sección.

### Aviso para retirar el USB

| Señal | Cuándo funciona |
|---|---|
| **LED de Bloq Mayús** parpadeando: **lento** (8 veces, ~14 s) = listo, retíralo; **rápido** (~12 s) = error | Siempre, aunque nadie haya iniciado sesión o la pantalla esté apagada. **Es el aviso principal.** |
| Notificación de escritorio (`notify-send`) y sonido (`complete.oga` o `dialog-error.oga`, con `pw-play`) | Solo si tienes una sesión abierta. Si no, se registra y sigue. |
| journal y `~/backups/electrosac/usb.log` | Siempre. |

Por qué no un pitido: en esta laptop el altavoz interno (`pcspkr`) está en
`/etc/modprobe.d/blacklist.conf`, así que `beep` o `\a` no sonarían. El
sonido por los altavoces necesita la sesión de PipeWire del usuario. El LED,
en cambio, solo necesita root, y el servicio corre como root.

El LED se apaga cuando el script ya cerró el USB, así que en ese momento ya se
puede retirar. Si el aviso dice «no lo retires aún», el cierre falló: revisa
`lsblk` y el log.

### Registro y comprobación

```bash
journalctl -u respaldo-usb -n 50          # detalle de la última vez
tail -20 ~/backups/electrosac/usb.log      # hora, qué copió, espacio libre, verificación
cat ~/backups/electrosac/USB_ULTIMA_COPIA  # época, fecha y respaldo de la última copia correcta
~/Proyecto/Grupo-Activo/Proyecto-Electro/scripts/backup/usb/comprobar-usb.sh
```

Si la última copia correcta tiene más de `DIAS_AVISO` días (8), el aviso
«AVISO USB: hace N días que no se copia al USB» sale en tres sitios:

- en `backup.log`, al final de cada respaldo diario;
- en `backup.sh --estado`;
- en `comprobar-usb.sh`, que además sale con código 1.

La marca solo cambia cuando se **copia y verifica** algo nuevo. Si conectas el
USB pero los respaldos locales llevan días sin generarse, no hay nada nuevo
que copiar, así que el aviso aparece igual.

---

## Instalación paso a paso (la haces tú)

> Todos los comandos con `sudo` los ejecutas tú. Los pasos a)–d) se hacen una
> sola vez por USB. Pon el número de tu USB en lugar de `/dev/sdX`: **no
> copies `sdX` tal cual**.

### 0) Requisito: cryptsetup

En esta laptop **no está instalado** (solo `systemd-cryptsetup`):

```bash
sudo apt install cryptsetup-bin
cryptsetup --version
```

### a) Identificar el USB y desmontarlo

```bash
# Antes de conectarlo:
lsblk -o NAME,MODEL,SIZE,TRAN,TYPE,FSTYPE,MOUNTPOINTS
# Conéctalo y repite. El nuevo disco debe tener TRAN=usb, el modelo de tu USB
# y unos 28-30 G (32 GB del fabricante = ~29,8 GiB):
lsblk -o NAME,MODEL,SIZE,TRAN,TYPE,FSTYPE,MOUNTPOINTS
```

```bash
USB=/dev/sdX        # ← el tuyo (el disco entero, sin número)
lsblk -dno NAME,MODEL,SIZE,TRAN "$USB"    # comprueba OTRA VEZ modelo, ~29 G y "usb"
# Desmontar lo que el escritorio haya montado:
for p in $(lsblk -lnpo NAME "$USB" | tail -n +2); do udisksctl unmount -b "$p" 2>/dev/null; done
lsblk -o NAME,MOUNTPOINTS "$USB"           # no debe quedar nada montado
```

Si te equivocas de disco en el paso siguiente, borras ese disco. El disco
interno de la laptop no tiene `TRAN=usb`.

### b) Formatear con LUKS2 + ext4

> ⚠️ **ESTO BORRA TODO EL CONTENIDO DEL USB.** Si tiene la copia manual en
> FAT32 que quieras conservar, cópiala antes a otro sitio.

```bash
# Tabla GPT con una sola partición (así queda /dev/sdX1):
sudo wipefs -a "$USB"
sudo parted -s "$USB" mklabel gpt mkpart respaldo 1MiB 100%
sudo partprobe "$USB"; sleep 2
PART="${USB}1"
lsblk -o NAME,SIZE,TYPE "$USB"

# LUKS2. Pide escribir YES (en mayúsculas) y luego tu frase dos veces:
sudo cryptsetup luksFormat --type luks2 "$PART"

# Abrir (pide la frase), crear ext4 con etiqueta y cerrar:
sudo cryptsetup open "$PART" respaldo-usb
sudo mkfs.ext4 -L RESPALDO-ESAC -m 0 /dev/mapper/respaldo-usb
sudo cryptsetup close respaldo-usb
```

Si el escritorio abre una ventana pidiendo la frase mientras haces esto,
cancélala. Después del paso e) ya no la abrirá.

Usa una frase larga, por ejemplo 5-6 palabras al azar: es lo único que protege
los datos si alguien encuentra el USB.

### c) Archivo-llave del servidor (segunda ranura LUKS)

```bash
sudo sh -c 'umask 077 && head -c 4096 /dev/urandom > /root/.respaldo-usb.key'
sudo chown root:root /root/.respaldo-usb.key
sudo chmod 400 /root/.respaldo-usb.key
sudo stat -c '%U:%G %a %s bytes' /root/.respaldo-usb.key    # root:root 400 4096 bytes

# Añadirlo como segunda llave (pide TU frase, para autorizar):
sudo cryptsetup luksAddKey "$PART" /root/.respaldo-usb.key

# Comprobar sin abrir nada: la llave funciona y hay dos ranuras (0 = frase, 1 = archivo):
sudo cryptsetup open --test-passphrase --key-file /root/.respaldo-usb.key "$PART" && echo "llave OK"
sudo cryptsetup luksDump "$PART" | grep -E '^\s+[0-9]+: luks2'
```

No muestres ni copies el archivo-llave a ningún otro sitio. Si se pierde,
basta con crear otro (paso h).

### d) UUID de la partición LUKS → configuración

```bash
cd ~/Proyecto/Grupo-Activo/Proyecto-Electro/scripts/backup/usb
UUID="$(sudo cryptsetup luksUUID "$PART")"; echo "$UUID"
sed -i "s/^UUID_LUKS=.*/UUID_LUKS=\"$UUID\"/" respaldo-usb.conf
grep ^UUID_LUKS respaldo-usb.conf
```

Revisa también, en `respaldo-usb.conf`:

- `USUARIO`;
- `COPIAS_A_CONSERVAR` (5);
- `AVISO_LED`.

### e) Instalar la regla udev y la unidad systemd

```bash
cd ~/Proyecto/Grupo-Activo/Proyecto-Electro/scripts/backup/usb
sudo install -o root -g root -m 644 respaldo-usb.conf    /etc/respaldo-usb.conf
sudo install -o root -g root -m 755 respaldo-usb.sh      /usr/local/sbin/respaldo-usb.sh
sudo install -o root -g root -m 644 respaldo-usb.service /etc/systemd/system/respaldo-usb.service
( source ./respaldo-usb.conf
  sed -e "s/__UUID_LUKS__/$UUID_LUKS/" -e "s/__NOMBRE_MAPPER__/$NOMBRE_MAPPER/" 99-respaldo-usb.rules
) | sudo tee /etc/udev/rules.d/99-respaldo-usb.rules >/dev/null
grep -c __ /etc/udev/rules.d/99-respaldo-usb.rules        # debe dar 0 (no quedan marcadores)
sudo udevadm verify /etc/udev/rules.d/99-respaldo-usb.rules
sudo udevadm control --reload
sudo systemctl daemon-reload
```

No hace falta `systemctl enable`: la unidad la arranca udev cuando aparece el
USB.

### f) Primera prueba

1. Retira el USB.
2. En una terminal, sigue el servicio:

   ```bash
   journalctl -fu respaldo-usb
   ```

3. Conecta el USB. Deberías ver:
   - «USB abierto y montado»;
   - «Respaldo más reciente: …»;
   - «Copiando …»;
   - «Verificación sha256: … OK»;
   - «Verificación gzip -t: OK»;
   - «Copias en el USB: 1»;
   - «Fin OK».

   Después parpadea el LED de Bloq Mayús, lento, y llega la notificación. No
   debe abrirse ninguna ventana pidiendo la frase.
4. Comprueba:

   ```bash
   tail -15 ~/backups/electrosac/usb.log
   cat ~/backups/electrosac/USB_ULTIMA_COPIA
   systemctl status respaldo-usb --no-pager     # inactive (dead), status=0/SUCCESS
   lsblk -o NAME,TYPE,MOUNTPOINTS               # NO debe aparecer "respaldo-usb" (crypt)
   udevadm info "$PART" | grep -E 'UDISKS_IGNORE|SYSTEMD_WANTS'
   ```

5. Retira el USB.
6. (Opcional) Conéctalo otra vez. El log debe decir «Ya está en el USB … No
   se copia de nuevo».

Si falla, el motivo está en el journal y en `usb.log`. Corrige y vuelve a
conectar: no hay que limpiar nada a mano.

### g) Restaurar desde el USB en otro PC Linux (con la frase)

```bash
sudo apt install cryptsetup-bin          # o el equivalente de esa distribución
lsblk -o NAME,MODEL,SIZE,TRAN,FSTYPE     # el USB: partición con FSTYPE crypto_LUKS
PART=/dev/sdY1                           # ← la de ese PC
sudo cryptsetup open "$PART" respaldo-usb          # pide la frase
sudo mkdir -p /mnt/respaldo-usb
sudo mount -o ro /dev/mapper/respaldo-usb /mnt/respaldo-usb
ls /mnt/respaldo-usb/respaldos-electrosac/         # una carpeta por respaldo (AAAA-MM-DD_HHMMSS)

# Copiar el que quieras (los archivos son de root, 600) y verificarlo:
FECHA=AAAA-MM-DD_HHMMSS                  # ← la carpeta elegida
mkdir -p ~/restaurar
sudo cp -r "/mnt/respaldo-usb/respaldos-electrosac/$FECHA" ~/restaurar/
sudo chown -R "$USER": ~/restaurar
cd ~/restaurar/"$FECHA" && sha256sum -c electrosac_*.sha256   # las dos líneas deben decir OK

sudo umount /mnt/respaldo-usb
sudo cryptsetup close respaldo-usb
```

Para restaurar la base y `uploads` a partir de esos archivos, sigue la sección
**Restaurar** de [`../README.md`](../README.md#restaurar) (`restaurar.sh`, en
una base vacía, nunca sobre producción).

### h) USB perdido, cambio de frase, retirar la llave del servidor

Si haces estas operaciones en el **servidor**, al conectar el USB salta la
copia automática:

1. Espera a que termine: el LED parpadea y `systemctl is-active
   respaldo-usb` dice `inactive`.
2. Deja el USB conectado. Ya está cerrado, y estas órdenes trabajan sobre la
   partición sin abrirla:

   ```bash
   PART=/dev/sdX1     # ← compruébalo con lsblk como en el paso a)
   ```

- **Cambiar la frase** (ranura 0). Pide la actual y luego la nueva:

  ```bash
  sudo cryptsetup luksChangeKey "$PART"
  ```

- **Ver qué ranuras hay:**

  ```bash
  sudo cryptsetup luksDump "$PART"
  ```

- **Retirar la llave del servidor del USB:**

  ```bash
  sudo cryptsetup luksRemoveKey "$PART" /root/.respaldo-usb.key
  # o, si el archivo ya no existe, por número de ranura (pide la frase):
  sudo cryptsetup luksKillSlot "$PART" 1
  ```

  Después, la copia automática deja de funcionar con ese USB hasta que
  añadas otra llave (paso c).
- **Si se pierde el USB.** Con una frase fuerte, los datos están a salvo:
  sin la frase o sin `/root/.respaldo-usb.key` no se puede abrir.
  1. Prepara otro USB con los pasos a)–f), con una frase nueva y un
     archivo-llave nuevo:

     ```bash
     sudo shred -u /root/.respaldo-usb.key
     ```

     Luego vuelve al paso c). El USB nuevo tiene otro UUID: repite los pasos
     d) y e).
  2. Si además el servidor pudo quedar expuesto, la llave antigua ya no sirve
     porque el USB perdido no vuelve. Lo importante es la frase: no la
     reutilices.
- **Si se pierde o se cambia el servidor.** Con la frase abres el USB en
  cualquier PC (paso g). En el servidor nuevo, crea otra llave y añádela con
  la frase (pasos c-e). Si aún tienes el USB, quita la ranura antigua con
  `luksKillSlot "$PART" 1`.

### i) ⚠️ Guarda la frase fuera del servidor

Guarda la frase en un lugar seguro y **fuera de esta laptop**: un gestor de
contraseñas o un papel en sobre cerrado en otro sitio.

- **Sin la frase y sin el servidor, el USB no se puede abrir.** Nadie puede
  recuperarlo, tampoco tú.
- El archivo-llave no tiene copia, a propósito.

---

## Probar sin root (`--prueba`)

**Pruebas automáticas:** ejecuta `scripts/backup/usb/pruebas/pruebas-usb.sh`
(~40 s). Trabaja en una carpeta temporal propia que borra al terminar y no
toca `~/backups`. Sale con código 0 si todo pasa. Con `CONSERVAR_TMP=1`
conserva la carpeta para revisarla.

`respaldo-usb.sh --prueba` se salta LUKS, el montaje y los avisos, y copia de
`ORIGEN` a `PUNTO_MONTAJE` tal cual. Sirve para probar la copia, la
verificación y la retención con carpetas temporales:

```bash
RESPALDO_USB_CONF=/ruta/prueba.conf ./respaldo-usb.sh --prueba
```

En `prueba.conf`, apunta `ORIGEN`, `PUNTO_MONTAJE`, `LOG_USB`, `MARCA` y
`RUTA_LOCK` a carpetas temporales. Además, solo con `--prueba`:

- `PRUEBA_DF_TOTAL` y `PRUEBA_DF_LIBRE` (en bytes) simulan el espacio del USB;
- en lugar de desmontar y volver a montar, se descarta la caché de los
  archivos con `dd iflag=nocache`.
