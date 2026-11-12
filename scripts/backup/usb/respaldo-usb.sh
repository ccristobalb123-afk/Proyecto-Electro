#!/usr/bin/env bash
# =====================================================================
# Copia el respaldo más reciente de ElectroSAC al USB cifrado.
#
# Lo lanza systemd (respaldo-usb.service, como root) cuando la regla udev
# detecta ESTE USB por el UUID de su partición LUKS. Pasos:
#   1. cryptsetup open con el archivo-llave → fsck -p → mount
#   2. elige el respaldo más reciente (diarios y semanales, por la fecha
#      del nombre) con sus 3 archivos: .sql.gz, .uploads.tar.gz, .sha256
#   3. si ya está en el USB, no copia nada
#   4. comprueba que, tras copiar, quede ≥ MIN_LIBRE_PCT % libre
#   5. copia a <USB>/<CARPETA_USB>/.en-curso-<FECHA> y sincroniza
#   6. desmonta y vuelve a montar (para leer del USB, no de la caché) y
#      verifica: sha256sum -c y gzip -t de los dos .gz
#   7. solo si todo da OK: renombra a <FECHA>/, aplica la retención
#      (COPIAS_A_CONSERVAR) y actualiza la marca de última copia correcta
#   8. siempre (también si falla o retiran el USB): desmonta y cierra LUKS,
#      y avisa (journal, usb.log, notify-send + sonido, LED de Bloq Mayús)
#
# Uso:
#   respaldo-usb.sh            modo real (root; lo usa systemd)
#   respaldo-usb.sh --prueba   sin LUKS, sin montar y sin avisos: copia de
#                              ORIGEN a PUNTO_MONTAJE tal cual (para probar
#                              con carpetas temporales y RESPALDO_USB_CONF)
#
# Configuración: /etc/respaldo-usb.conf, o la ruta en RESPALDO_USB_CONF.
# =====================================================================
set -Eeuo pipefail
umask 077
export LC_ALL=C.UTF-8
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin${PATH:+:$PATH}"

PRUEBA=0
case "${1:-}" in
  --prueba) PRUEBA=1 ;;
  "") ;;
  *) echo "Uso: $0 [--prueba]" >&2; exit 2 ;;
esac

CONF="${RESPALDO_USB_CONF:-/etc/respaldo-usb.conf}"
[[ -r "$CONF" ]] || { echo "ERROR: no se puede leer la configuración $CONF" >&2; exit 2; }
# shellcheck source=respaldo-usb.conf
source "$CONF"

for v in USUARIO UUID_LUKS ARCHIVO_LLAVE NOMBRE_MAPPER PUNTO_MONTAJE ORIGEN \
         CARPETA_USB COPIAS_A_CONSERVAR MIN_LIBRE_PCT LOG_USB MARCA RUTA_LOCK; do
  [[ -n "${!v:-}" ]] || { echo "ERROR: falta $v en $CONF" >&2; exit 2; }
done
[[ "$COPIAS_A_CONSERVAR" =~ ^[1-9][0-9]*$ ]] || { echo "ERROR: COPIAS_A_CONSERVAR debe ser un entero ≥ 1" >&2; exit 2; }
[[ "$MIN_LIBRE_PCT" =~ ^[0-9]+$ ]] && (( MIN_LIBRE_PCT < 100 )) || { echo "ERROR: MIN_LIBRE_PCT debe estar entre 0 y 99" >&2; exit 2; }
[[ "$PUNTO_MONTAJE" == /* && "$ORIGEN" == /* ]] || { echo "ERROR: PUNTO_MONTAJE y ORIGEN deben ser rutas absolutas" >&2; exit 2; }
[[ "$CARPETA_USB" =~ ^[A-Za-z0-9._-]+$ ]] || { echo "ERROR: CARPETA_USB debe ser un nombre simple" >&2; exit 2; }

DISPOSITIVO="/dev/disk/by-uuid/$UUID_LUKS"
MAPPER="/dev/mapper/$NOMBRE_MAPPER"
DEST="$PUNTO_MONTAJE/$CARPETA_USB"
RE_FECHA='^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6}$'

# ---------------------------------------------------------------------
# Registro: stdout/stderr van al journal (systemd); además, una línea con
# fecha en LOG_USB, escrita COMO TU USUARIO (root no escribe directamente
# en tu carpeta personal).
# ---------------------------------------------------------------------
como_usuario() {
  if (( EUID == 0 )) && [[ "$USUARIO" != root ]]; then
    setpriv --reuid="$USUARIO" --regid="$(id -g "$USUARIO")" --init-groups -- "$@"
  else
    "$@"
  fi
}
log() {
  printf '%s\n' "$*"
  printf '%s  %s\n' "$(date '+%F %T %z')" "$*" | como_usuario tee -a "$LOG_USB" >/dev/null 2>&1 || true
}

ABIERTO=0      # 1 = cryptsetup open hecho por este script
MONTADO=0      # 1 = montado por este script
TMP_USB=""     # carpeta .en-curso-* de la copia en marcha
RESULTADO=""   # texto del resultado para el aviso final
MOTIVO=""      # motivo del error, si lo hay

fallar() { MOTIVO="$*"; log "ERROR: $*"; exit 1; }

al_error() {
  local codigo=$1 linea=$2 orden=$3
  [[ -n "$MOTIVO" ]] || MOTIVO="falló «$orden» (línea $linea, código $codigo)"
  log "ERROR: $MOTIVO"
}

desmontar() {
  (( MONTADO )) || return 0
  sync
  if umount "$PUNTO_MONTAJE" 2>/dev/null; then
    MONTADO=0
  elif umount -l "$PUNTO_MONTAJE"; then
    log "Aviso: desmontaje diferido (umount -l)"; MONTADO=0
  else
    return 1
  fi
}

cerrar_luks() {
  (( ABIERTO )) || return 0
  if cryptsetup close "$NOMBRE_MAPPER" 2>/dev/null; then
    ABIERTO=0
  elif cryptsetup close --deferred "$NOMBRE_MAPPER"; then
    log "Aviso: cierre LUKS diferido (se completa cuando el dispositivo quede libre)"; ABIERTO=0
  else
    return 1
  fi
}

# ---------------------------------------------------------------------
# Avisos al terminar: escritorio (si hay sesión) + LED (siempre que exista).
# Ninguno puede hacer fallar el script.
# ---------------------------------------------------------------------
aviso_escritorio() {
  local tipo=$1 titulo=$2 cuerpo=$3 uid gid bus sonido urgencia
  [[ "${AVISO_ESCRITORIO:-1}" == 1 ]] || return 0
  uid="$(id -u "$USUARIO" 2>/dev/null)" || return 0
  gid="$(id -g "$USUARIO")"
  bus="/run/user/$uid/bus"
  [[ -S "$bus" ]] || { log "Sin sesión de $USUARIO abierta: no hay aviso de escritorio (queda el LED)."; return 0; }
  if [[ "$tipo" == ok ]]; then
    urgencia=normal; sonido=/usr/share/sounds/freedesktop/stereo/complete.oga
  else
    urgencia=critical; sonido=/usr/share/sounds/freedesktop/stereo/dialog-error.oga
  fi
  local entorno=(env "DBUS_SESSION_BUS_ADDRESS=unix:path=$bus" "XDG_RUNTIME_DIR=/run/user/$uid")
  if command -v notify-send >/dev/null; then
    timeout 10 setpriv --reuid="$uid" --regid="$gid" --init-groups -- "${entorno[@]}" \
      notify-send -u "$urgencia" -a "Respaldo USB" -i drive-removable-media "$titulo" "$cuerpo" >/dev/null 2>&1 \
      || log "Aviso: notify-send no pudo mostrar la notificación"
  fi
  if [[ -r "$sonido" ]]; then
    local reproductor
    for reproductor in pw-play paplay; do
      if command -v "$reproductor" >/dev/null; then
        timeout 10 setpriv --reuid="$uid" --regid="$gid" --init-groups -- "${entorno[@]}" \
          "$reproductor" "$sonido" >/dev/null 2>&1 || true
        break
      fi
    done
  fi
}

aviso_led() {
  local tipo=$1 led veces encendido apagado i
  [[ -n "${AVISO_LED:-}" ]] || return 0
  local -a leds=() disparadores=() brillos=()
  # AVISO_LED puede llevar comodines; se expanden aquí a propósito.
  # shellcheck disable=SC2206
  local candidatos=($AVISO_LED)
  for led in "${candidatos[@]}"; do
    [[ -w "$led/brightness" && -w "$led/trigger" ]] || continue
    leds+=("$led")
    disparadores+=("$(sed -n 's/.*\[\([^]]*\)\].*/\1/p' "$led/trigger")")
    brillos+=("$(cat "$led/brightness")")
    echo none > "$led/trigger" 2>/dev/null || true
  done
  (( ${#leds[@]} )) || return 0
  if [[ "$tipo" == ok ]]; then veces=8; encendido=1; apagado=0.7
  else veces=40; encendido=0.15; apagado=0.15; fi
  for (( i = 0; i < veces; i++ )); do
    for led in "${leds[@]}"; do echo 1 > "$led/brightness" 2>/dev/null || true; done
    sleep "$encendido"
    for led in "${leds[@]}"; do echo 0 > "$led/brightness" 2>/dev/null || true; done
    sleep "$apagado"
  done
  for i in "${!leds[@]}"; do
    echo "${brillos[$i]}" > "${leds[$i]}/brightness" 2>/dev/null || true
    [[ -n "${disparadores[$i]}" ]] && echo "${disparadores[$i]}" > "${leds[$i]}/trigger" 2>/dev/null || true
  done
}

avisar() {
  local tipo=$1 titulo=$2 cuerpo=$3
  if (( PRUEBA )); then log "(prueba) aviso $tipo: $titulo — $cuerpo"; return 0; fi
  aviso_escritorio "$tipo" "$titulo" "$cuerpo" || true
  aviso_led "$tipo" || true
}

# ---------------------------------------------------------------------
# Limpieza: SIEMPRE desmonta y cierra, pase lo que pase.
# ---------------------------------------------------------------------
terminar() {
  local codigo=$?
  trap - EXIT ERR INT TERM
  set +e
  if [[ -n "$TMP_USB" && -d "$TMP_USB" ]]; then
    # Si falló la verificación, el USB está montado en solo lectura.
    (( PRUEBA || ! MONTADO )) || mount -o remount,rw "$PUNTO_MONTAJE" 2>/dev/null
    rm -rf -- "$TMP_USB" 2>/dev/null && log "Copia incompleta eliminada: $(basename "$TMP_USB")"
  fi
  local cierre_ok=1
  if (( ! PRUEBA )); then
    desmontar || { cierre_ok=0; log "ERROR: no se pudo desmontar $PUNTO_MONTAJE"; }
    cerrar_luks || { cierre_ok=0; log "ERROR: no se pudo cerrar $MAPPER"; }
  fi
  if (( codigo == 0 && cierre_ok )); then
    log "Fin OK: $RESULTADO. USB cerrado: ya puedes retirarlo."
    avisar ok "Respaldo USB: listo, retíralo" "$RESULTADO"
  else
    (( codigo != 0 )) || codigo=1
    [[ -n "$MOTIVO" ]] || MOTIVO="no se pudo desmontar o cerrar el USB"
    if (( cierre_ok )); then
      log "Fin con ERROR: $MOTIVO. No se borró ninguna copia anterior. USB cerrado: puedes retirarlo y repetir la próxima vez."
      avisar error "Respaldo USB: ERROR" "$MOTIVO. Ver $LOG_USB. Puedes retirar el USB."
    else
      log "Fin con ERROR: $MOTIVO. El USB NO quedó cerrado: revisa con «lsblk» antes de retirarlo."
      avisar error "Respaldo USB: ERROR, no lo retires aún" "$MOTIVO. Ver $LOG_USB."
    fi
  fi
  exit "$codigo"
}
trap 'al_error $? $LINENO "$BASH_COMMAND"' ERR
trap terminar EXIT
trap 'MOTIVO="interrumpido por una señal (¿se detuvo el servicio?)"; exit 130' INT TERM

# ---------------------------------------------------------------------
# 1. Abrir y montar (solo modo real)
# ---------------------------------------------------------------------
abrir_y_montar() {
  (( EUID == 0 )) || fallar "hay que ejecutarlo como root (lo lanza systemd)"
  command -v cryptsetup >/dev/null || fallar "falta cryptsetup (sudo apt install cryptsetup-bin)"
  [[ "$UUID_LUKS" != 00000000-0000-0000-0000-000000000000 ]] || fallar "UUID_LUKS sin configurar en $CONF"
  [[ -f "$ARCHIVO_LLAVE" ]] || fallar "no existe el archivo-llave $ARCHIVO_LLAVE"

  local i
  for (( i = 0; i < 15; i++ )); do [[ -b "$DISPOSITIVO" ]] && break; sleep 1; done
  [[ -b "$DISPOSITIVO" ]] || fallar "no aparece $DISPOSITIVO (¿USB retirado?)"
  cryptsetup isLuks "$DISPOSITIVO" || fallar "$DISPOSITIVO no es una partición LUKS"

  # Restos de una vez anterior (por ejemplo, USB retirado a mitad).
  if mountpoint -q "$PUNTO_MONTAJE"; then
    log "Restos de una ejecución anterior: desmontando $PUNTO_MONTAJE"
    umount "$PUNTO_MONTAJE" 2>/dev/null || umount -l "$PUNTO_MONTAJE"
  fi
  if [[ -e "$MAPPER" ]]; then
    log "Restos de una ejecución anterior: cerrando $MAPPER"
    cryptsetup close "$NOMBRE_MAPPER" || fallar "$MAPPER sigue abierto y no se puede cerrar"
  fi

  cryptsetup open --type luks2 --key-file "$ARCHIVO_LLAVE" "$DISPOSITIVO" "$NOMBRE_MAPPER" \
    || fallar "cryptsetup open falló (¿falta la ranura del archivo-llave?)"
  ABIERTO=1

  # Revisión rápida del sistema de archivos (por si se retiró sin cerrar).
  # Códigos de fsck: 0 = limpio, 1 = corregido, ≥ 2 = problema.
  local rc=0
  fsck.ext4 -p "$MAPPER" >/dev/null 2>&1 || rc=$?
  (( rc <= 1 )) || fallar "fsck.ext4 encontró errores que no corrigió solo (código $rc)"
  (( rc == 0 )) || log "fsck.ext4 corrigió errores menores del sistema de archivos"

  install -d -m 700 "$PUNTO_MONTAJE"
  mount -t ext4 -o noatime,nodev,nosuid,noexec "$MAPPER" "$PUNTO_MONTAJE"
  MONTADO=1
  log "USB abierto y montado en $PUNTO_MONTAJE"
}

# Desmonta y vuelve a montar para que la verificación lea del USB y no de la
# caché de páginas del kernel. En --prueba solo se descarta la caché de los
# archivos (dd iflag=nocache), que no necesita root.
releer_desde_disco() {
  sync
  if (( PRUEBA )); then
    local f
    for f in "$@"; do dd if="$f" iflag=nocache count=0 status=none 2>/dev/null || true; done
    return 0
  fi
  umount "$PUNTO_MONTAJE" || fallar "no se pudo desmontar para verificar"
  MONTADO=0
  mount -t ext4 -o ro,noatime,nodev,nosuid,noexec "$MAPPER" "$PUNTO_MONTAJE"
  MONTADO=1
}
remontar_escritura() {
  (( PRUEBA )) && return 0
  mount -o remount,rw "$PUNTO_MONTAJE"
}

espacio() {  # imprime "total libre" en bytes de PUNTO_MONTAJE
  if (( PRUEBA )) && [[ -n "${PRUEBA_DF_TOTAL:-}" && -n "${PRUEBA_DF_LIBRE:-}" ]]; then
    echo "$PRUEBA_DF_TOTAL $PRUEBA_DF_LIBRE"; return 0
  fi
  df -B1 --output=size,avail "$PUNTO_MONTAJE" | awk 'NR == 2 { print $1, $2 }'
}
humano() { numfmt --to=iec --suffix=B "$1"; }

# ---------------------------------------------------------------------
# 2-7. Copiar, verificar y rotar
# ---------------------------------------------------------------------
copiar() {
  # --- Respaldo más reciente (por la fecha del nombre), con sus 3 archivos.
  # diarios:   electrosac_AAAA-MM-DD_HHMMSS.*
  # semanales: electrosac_AAAA-Sss_AAAA-MM-DD_HHMMSS.*  (enlace duro del diario)
  local re='^electrosac_([0-9]{4}-S[0-9]{2}_)?([0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{6})\.sql\.gz$'
  local fecha="" base_orig="" f nombre fecha_f carpeta
  for carpeta in "$ORIGEN/diarios" "$ORIGEN/semanales"; do
    [[ -d "$carpeta" ]] || continue
    for f in "$carpeta"/electrosac_*.sql.gz; do
      [[ -f "$f" ]] || continue
      nombre="$(basename "$f")"
      [[ "$nombre" =~ $re ]] || continue
      fecha_f="${BASH_REMATCH[2]}"
      local b="${f%.sql.gz}"
      [[ -f "$b.uploads.tar.gz" && -f "$b.sha256" ]] || continue
      # ">" estricto: con la misma fecha se queda el diario (se recorre antes).
      if [[ -z "$fecha" || "$fecha_f" > "$fecha" ]]; then fecha="$fecha_f"; base_orig="$b"; fi
    done
  done
  [[ -n "$fecha" ]] || fallar "no hay ningún respaldo completo en $ORIGEN"
  log "Respaldo más reciente: $(basename "$base_orig") ($(basename "$(dirname "$base_orig")"))"

  local sql="electrosac_$fecha.sql.gz" tar="electrosac_$fecha.uploads.tar.gz" sum="electrosac_$fecha.sha256"

  install -d -m 700 "$DEST"

  # --- ¿Ya está en el USB? (una carpeta <FECHA>/ solo existe si se verificó)
  if [[ -d "$DEST/$fecha" ]]; then
    read -r total libre < <(espacio)
    RESULTADO="el respaldo $fecha ya estaba en el USB; no se copió nada. Libre: $(humano "$libre") de $(humano "$total")"
    log "Ya está en el USB: $fecha. No se copia de nuevo."
    return 0
  fi

  # --- Restos de copias fallidas anteriores (nunca fueron copias válidas).
  for f in "$DEST"/.en-curso-*; do
    [[ -e "$f" ]] || continue
    log "Eliminando copia incompleta de un intento anterior: $(basename "$f")"
    rm -rf -- "$f"
  done

  # --- El .sha256 debe listar exactamente estos dos archivos.
  local lista esperado
  lista="$(awk '{ sub(/^\*/, "", $2); print $2 }' "$base_orig.sha256" | sort)"
  esperado="$(printf '%s\n' "$sql" "$tar" | sort)"
  [[ "$lista" == "$esperado" ]] || fallar "$(basename "$base_orig").sha256 no lista $sql y $tar"

  # --- Comprobar el origen antes de gastar el USB en una copia dañada.
  local dir_orig
  dir_orig="$(dirname "$base_orig")"
  if [[ "$(basename "$base_orig")" == "electrosac_$fecha" ]]; then
    (cd "$dir_orig" && sha256sum -c --strict --quiet "$sum") >/dev/null 2>&1 \
      || fallar "el respaldo de origen $fecha no cuadra con su .sha256 (no se copió)"
  else
    # semanal: los nombres del .sha256 son los del diario; se compara a mano.
    local h_sql h_tar
    h_sql="$(sha256sum < "$base_orig.sql.gz" | cut -d' ' -f1)"
    h_tar="$(sha256sum < "$base_orig.uploads.tar.gz" | cut -d' ' -f1)"
    grep -qxF "$h_sql  $sql" "$base_orig.sha256" && grep -qxF "$h_tar  $tar" "$base_orig.sha256" \
      || fallar "el respaldo de origen $fecha no cuadra con su .sha256 (no se copió)"
  fi

  # --- Espacio: tras copiar debe quedar ≥ MIN_LIBRE_PCT % libre.
  local necesario total libre
  necesario=$(( $(stat -c %s "$base_orig.sql.gz") + $(stat -c %s "$base_orig.uploads.tar.gz") + $(stat -c %s "$base_orig.sha256") + 3 * 4096 ))
  read -r total libre < <(espacio)
  if (( (libre - necesario) * 100 < total * MIN_LIBRE_PCT )); then
    fallar "espacio insuficiente: libre $(humano "$libre") de $(humano "$total"); tras copiar $(humano "$necesario") quedaría menos del $MIN_LIBRE_PCT %. No se copió nada (baja COPIAS_A_CONSERVAR o usa un USB mayor)"
  fi

  # --- Copiar a una carpeta temporal; con los nombres que espera el .sha256.
  TMP_USB="$DEST/.en-curso-$fecha"
  install -d -m 700 "$TMP_USB"
  log "Copiando $fecha ($(humano "$necesario")) al USB…"
  cp --preserve=timestamps -- "$base_orig.sql.gz"        "$TMP_USB/$sql"
  cp --preserve=timestamps -- "$base_orig.uploads.tar.gz" "$TMP_USB/$tar"
  cp --preserve=timestamps -- "$base_orig.sha256"         "$TMP_USB/$sum"
  chmod 600 "$TMP_USB/$sql" "$TMP_USB/$tar" "$TMP_USB/$sum"

  # --- Verificar leyendo DESDE EL USB.
  releer_desde_disco "$TMP_USB/$sql" "$TMP_USB/$tar" "$TMP_USB/$sum"
  local salida
  salida="$(cd "$TMP_USB" && sha256sum -c --strict "$sum" 2>&1)" \
    || fallar "verificación sha256 de la copia en el USB: $(tr '\n' ' ' <<< "$salida")"
  log "Verificación sha256: $(tr '\n' ' ' <<< "$salida")"
  gzip -t "$TMP_USB/$sql" 2>/dev/null || fallar "gzip -t falló en $sql (copia en el USB)"
  gzip -t "$TMP_USB/$tar" 2>/dev/null || fallar "gzip -t falló en $tar (copia en el USB)"
  log "Verificación gzip -t: OK ($sql, $tar)"
  remontar_escritura

  # --- Todo OK: dar la copia por buena (rename atómico).
  mv -T -- "$TMP_USB" "$DEST/$fecha"
  TMP_USB=""
  sync

  # --- Retención: solo ahora, con la nueva verificada.
  local -a copias=()
  for f in "$DEST"/*/; do
    f="$(basename "$f")"
    [[ "$f" =~ $RE_FECHA ]] && copias+=("$f")
  done
  mapfile -t copias < <(printf '%s\n' "${copias[@]}" | sort -r)
  local sobrantes=("${copias[@]:$COPIAS_A_CONSERVAR}") borradas=0
  for f in "${sobrantes[@]}"; do
    [[ "$f" == "$fecha" ]] && continue   # nunca la recién copiada
    rm -rf -- "${DEST:?}/$f"
    log "Retención: eliminada la copia $f del USB"
    borradas=$((borradas + 1))
  done
  sync

  # --- Marca de última copia correcta (la lee comprobar-usb.sh).
  printf '%s %s %s\n' "$(date +%s)" "$(date '+%F %T')" "$fecha" | como_usuario tee "$MARCA" >/dev/null \
    || log "Aviso: no se pudo escribir la marca $MARCA"

  read -r total libre < <(espacio)
  local quedan=$(( ${#copias[@]} - borradas ))
  RESULTADO="copiado y verificado $fecha ($(humano "$necesario")); copias en el USB: $quedan; libre: $(humano "$libre") de $(humano "$total")"
  log "Copias en el USB: $quedan (máximo $COPIAS_A_CONSERVAR). Libre: $(humano "$libre") de $(humano "$total")"
}

# ---------------------------------------------------------------------
exec 8>"$RUTA_LOCK"
flock -n 8 || { MOTIVO="ya hay otra copia al USB en curso"; trap - EXIT; echo "$MOTIVO" >&2; exit 0; }

log "=== Inicio de la copia al USB$( (( PRUEBA )) && echo ' (prueba)' ) ==="
(( PRUEBA )) || abrir_y_montar
copiar
