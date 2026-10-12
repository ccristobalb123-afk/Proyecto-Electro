# Respaldos de ElectroSAC

Respaldan cada día la base de datos `electrosac` y la carpeta `backend/uploads`
en `~/backups/electrosac/`, fuera del proyecto. La carpeta tiene permisos 700 y
los archivos 600.

| Archivo | Qué hace |
|---|---|
| `backup.sh` | Crea y verifica un respaldo, rota los viejos y registra todo en `backup.log`. |
| `restaurar.sh` | Restaura un respaldo en una base **vacía** (nunca sobre producción). |
| `_comun.sh` | Credenciales y rutas que comparten los dos scripts. |
| `crontab.txt` | Las líneas de cron que hay que instalar. |

## Qué queda en `~/backups/electrosac/`

```
diarios/electrosac_2026-10-12_030000.sql.gz          base de datos (pg_dump comprimido)
diarios/electrosac_2026-10-12_030000.uploads.tar.gz  archivos subidos
diarios/electrosac_2026-10-12_030000.sha256          sumas para verificar
semanales/electrosac_2026-S42_…                      el primer respaldo de cada semana
backup.log                                           fecha, tamaños y errores
ULTIMO_ESTADO                                        "OK …" o "ERROR …"
```

- **Retención:** 14 diarios y 8 semanales. Los semanales son enlaces duros
  (*hard links*), así que no ocupan espacio extra.
- **Seguridad de la rotación:** se borran los viejos solo **después** de crear y
  verificar el nuevo.
- **Verificaciones de cada respaldo:**
  - `gzip -t`;
  - que el volcado termine con `PostgreSQL database dump complete` (uno
    cortado no la tiene);
  - que tenga tablas;
  - que el tar sea legible y tenga tantos archivos como `uploads`.
- Si algo falla, sale con código ≠ 0 y lo registra en `backup.log` y en
  `ULTIMO_ESTADO`.

```bash
scripts/backup/backup.sh --estado      # resultado del último intento
tail -20 ~/backups/electrosac/backup.log
```

## Credenciales (sin contraseñas en scripts ni en la línea de comandos)

El script toma host, puerto, base y usuario de `backend/.env`. Para la contraseña
hay dos opciones:

1. **Recomendado, `~/.pgpass`.** Si tiene una línea para esta conexión, se usa
   esa. Créala **tú** (la contraseña es la de `DATABASE_URL` en `backend/.env`):

   ```bash
   touch ~/.pgpass && chmod 600 ~/.pgpass
   nano ~/.pgpass
   # una línea:   localhost:5432:electrosac:electrosac_user:LA_CONTRASEÑA
   # si la contraseña tiene ":" o "\", escríbelos como "\:" y "\\"
   ```

   Comprobar sin escribir la contraseña:
   `PGPASSWORD= psql -h localhost -U electrosac_user -d electrosac -w -c "select 1"`
2. **Sin `~/.pgpass` (lo que funciona hoy):** se lee la contraseña de
   `backend/.env` y se pasa solo como variable de entorno a `pg_dump`. No
   aparece en `ps` ni en el log.

`backup.log` indica en cada respaldo cuál de los dos métodos usó.

## Programación (cron del usuario)

Ver `crontab.txt`. El respaldo corre a las **03:00**. Si la laptop estaba
apagada o suspendida a esa hora, la revisión de cada hora y la del arranque
(`--si-falta`) lo hacen apenas vuelve, siempre que el último respaldo correcto
tenga más de 20 h. No hace falta `anacron` (que requiere root).

```bash
# Instalar SIN borrar las líneas que ya existan:
( crontab -l 2>/dev/null; cat ~/Proyecto/Grupo-Activo/Proyecto-Electro/scripts/backup/crontab.txt ) | crontab -
# Verificar:
crontab -l
systemctl is-active cron
```

## Restaurar

```bash
cd ~/Proyecto/Grupo-Activo/Proyecto-Electro/scripts/backup

# 1) Base de prueba en este servidor (el usuario de la app no puede crear bases):
sudo -u postgres createdb -O electrosac_user electrosac_restore_test
./restaurar.sh ~/backups/electrosac/diarios/electrosac_FECHA.sql.gz electrosac_restore_test --comparar
./restaurar.sh --borrar-prueba electrosac_restore_test

# 2) En otro servidor PostgreSQL (otra PC; la contraseña del destino va en su ~/.pgpass):
DESTINO_PGHOST=… DESTINO_PGPORT=… DESTINO_PGUSER=… ./restaurar.sh RESPALDO.sql.gz BASE

# 3) Archivos subidos (a una carpeta aparte; nunca encima de backend/):
./restaurar.sh --uploads RESPALDO.uploads.tar.gz /tmp/uploads-restaurados
```

`--comparar` cuenta las filas de cada tabla en la copia y en producción (solo
lectura) y sale con código 3 si hay diferencias. Producción cambia con el uso,
así que algunas diferencias en tablas como `refresh_tokens` pueden ser normales
si el respaldo no es de ese mismo momento.

### Recuperar PRODUCCIÓN de verdad

El script se niega a restaurar sobre `electrosac` a propósito. Si alguna vez
hace falta:

1. `pm2 stop electrosac`
2. Restaurar en una base nueva (por ejemplo `electrosac_recuperada`) y revisarla
   con `--comparar`.
3. Como `postgres`: renombrar la base dañada y luego la recuperada a
   `electrosac`, o apuntar `DATABASE_URL` a la nueva.
4. Restaurar `uploads` y copiarlo a `backend/uploads`.
5. `pm2 start electrosac`

## Copia fuera de la laptop

Los respaldos locales se pierden si la laptop se daña o la roban. Opciones, de
la más simple a la más automática:

1. **Disco USB (manual, semanal).** Conectar el USB y ejecutar:

   ```bash
   rsync -a --info=progress2 ~/backups/electrosac/ "/run/media/$USER/NOMBRE_USB/electrosac/"
   ```

   Sin credenciales nuevas. Conviene un USB cifrado (LUKS, desde la utilidad
   "Discos"), porque los respaldos contienen datos personales y hashes de
   contraseñas.
2. **Google Drive con `rclone`, automático.** Primero `sudo apt install rclone`
   y `rclone config`: crea un remoto "gdrive" e inicia sesión con Google en el
   navegador. Luego, conviene cifrar con `rclone config`: un remoto "crypt"
   sobre `gdrive:electrosac`. Y en cron, después del respaldo:

   ```
   30 3 * * * rclone sync ~/backups/electrosac cifrado: --exclude ".lock" --exclude ".en-curso-*"
   ```

   Requiere guardar el token de Google en `~/.config/rclone/rclone.conf`
   (permisos 600).
3. **Otra PC de la oficina con `rsync` sobre SSH, automático.** Con una clave
   SSH dedicada, sin contraseña, restringida en el destino a un solo comando
   (`rrsync`) y a una carpeta. Desde cron:

   ```
   30 3 * * * rsync -a ~/backups/electrosac/ respaldo@IP-OTRA-PC:electrosac/
   ```
