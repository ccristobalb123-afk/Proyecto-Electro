#!/usr/bin/env bash
# =====================================================================
# Respaldo diario de ElectroSAC: base de datos + carpeta backend/uploads.
#
#   backup.sh              crea un respaldo ahora
#   backup.sh --si-falta   solo si el último respaldo correcto tiene más
#                          de 20 h (para cron cada hora y al arrancar: si
#                          la laptop estaba apagada a las 03:00, se pone
#                          al día apenas se enciende)
#   backup.sh --estado     muestra el resultado del último intento
#
# Deja en $DESTINO (por defecto ~/backups/electrosac, permisos 700):
#   diarios/electrosac_AAAA-MM-DD_HHMMSS.sql.gz          (pg_dump, gzip)
#   diarios/electrosac_AAAA-MM-DD_HHMMSS.uploads.tar.gz  (backend/uploads)
#   diarios/electrosac_AAAA-MM-DD_HHMMSS.sha256          (sumas de control)
#   semanales/…  el primer respaldo de cada semana (enlace duro, no ocupa doble)
#   backup.log   fecha, tamaños y errores de cada intento
#   ULTIMO_ESTADO  "OK …" o "ERROR …" del último intento
# Archivos con permisos 600. Conserva 14 diarios y 8 semanales, y solo
# borra los viejos DESPUÉS de crear y verificar el nuevo.
# Sale con código ≠ 0 si algo falla (y lo deja escrito en el log).
# =====================================================================
set -Eeuo pipefail
umask 077

DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_comun.sh
source "$DIR_SCRIPT/_comun.sh"

DIARIOS_A_CONSERVAR="${DIARIOS_A_CONSERVAR:-14}"
SEMANALES_A_CONSERVAR="${SEMANALES_A_CONSERVAR:-8}"
HORAS_PARA_SI_FALTA=20
LOG="$DESTINO/backup.log"
ESTADO="$DESTINO/ULTIMO_ESTADO"

mkdir -p "$DESTINO/diarios" "$DESTINO/semanales"
chmod 700 "$DESTINO" "$DESTINO/diarios" "$DESTINO/semanales"
touch "$LOG" && chmod 600 "$LOG"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S %z')" "$*" | tee -a "$LOG" >&2; }

case "${1:-}" in
  --estado)
    cat "$ESTADO" 2>/dev/null || echo "Todavía no hay ningún respaldo."
    exit 0 ;;
  --si-falta)
    ultimo="$(find "$DESTINO/diarios" -name 'electrosac_*.sql.gz' -mmin "-$((HORAS_PARA_SI_FALTA * 60))" | head -1)"
    [[ -n "$ultimo" ]] && exit 0 ;;
  "") ;;
  *) echo "Uso: $0 [--si-falta | --estado]" >&2; exit 2 ;;
esac

# Un solo respaldo a la vez (cron de las 03:00 + revisión horaria + arranque).
exec 9>"$DESTINO/.lock"
flock -n 9 || { echo "Ya hay un respaldo en curso." >&2; exit 0; }

STAMP="$(date +%F_%H%M%S)"
TMP="$(mktemp -d "$DESTINO/.en-curso-XXXXXX")"
fallo() {
  local codigo=$? linea=$1
  log "ERROR: el respaldo $STAMP falló (línea $linea, código $codigo). No se borró ningún respaldo anterior."
  printf 'ERROR %s — ver %s\n' "$(date '+%F %T')" "$LOG" > "$ESTADO"
  rm -rf "$TMP"
  exit 1
}
trap 'fallo $LINENO' ERR
trap 'rm -rf "$TMP"' EXIT

log "Inicio del respaldo $STAMP"
cargar_credenciales_pg
log "Base: $PGDATABASE en $PGHOST:$PGPORT, usuario $PGUSER (credencial: $METODO_AUTENTICACION)"

# ---- (a) Base de datos ----
SQL="$TMP/electrosac_$STAMP.sql.gz"
pg_dump --no-owner --no-privileges --format=plain 2>>"$LOG" | gzip -9 > "$SQL"
gzip -t "$SQL"
[[ -s "$SQL" ]] || { log "ERROR: el volcado comprimido está vacío"; false; }
# pg_dump escribe esta línea solo si terminó bien: un volcado cortado no la tiene.
zcat "$SQL" | tail -n 20 | grep -q "PostgreSQL database dump complete" \
  || { log "ERROR: el volcado no termina con 'PostgreSQL database dump complete' (incompleto)"; false; }
tablas_volcado="$(zcat "$SQL" | grep -c '^CREATE TABLE ' || true)"
(( tablas_volcado > 0 )) || { log "ERROR: el volcado no contiene ninguna tabla"; false; }

# ---- (b) Archivos subidos ----
TAR="$TMP/electrosac_$STAMP.uploads.tar.gz"
tar -czf "$TAR" -C "$PROYECTO/backend" uploads
tar -tzf "$TAR" > "$TMP/contenido.txt"
en_tar="$(grep -vc '/$' "$TMP/contenido.txt" || true)"
en_disco="$(find "$PROYECTO/backend/uploads" -type f | wc -l)"
[[ "$en_tar" == "$en_disco" ]] || { log "ERROR: el tar tiene $en_tar archivos y uploads tiene $en_disco"; false; }

# ---- Guardar (solo ahora, con todo verificado) ----
SUMAS="$TMP/electrosac_$STAMP.sha256"
(cd "$TMP" && sha256sum "$(basename "$SQL")" "$(basename "$TAR")") > "$SUMAS"
chmod 600 "$SQL" "$TAR" "$SUMAS"
mv "$SQL" "$TAR" "$SUMAS" "$DESTINO/diarios/"
log "OK base de datos: $(tamano "$DESTINO/diarios/$(basename "$SQL")") ($tablas_volcado tablas)"
log "OK uploads: $(tamano "$DESTINO/diarios/$(basename "$TAR")") ($en_disco archivos)"

# Semanal: el primer respaldo de cada semana (lunes a domingo).
SEMANA="$(date +%G-S%V)"
if ! compgen -G "$DESTINO/semanales/electrosac_${SEMANA}_*" > /dev/null; then
  for f in "$DESTINO/diarios/electrosac_$STAMP".*; do
    ln "$f" "$DESTINO/semanales/electrosac_${SEMANA}_$(basename "$f" | sed 's/^electrosac_//')"
  done
  log "Guardado también como respaldo semanal ($SEMANA)"
fi

# ---- Rotación: solo después de un respaldo correcto ----
rotar() {
  local carpeta=$1 conservar=$2 patron=$3
  # Cada respaldo es un "juego" de 3 archivos con el mismo prefijo.
  mapfile -t juegos < <(find "$carpeta" -name "$patron.sql.gz" -printf '%f\n' | sed 's/\.sql\.gz$//' | sort -r)
  for juego in "${juegos[@]:$conservar}"; do
    rm -f "$carpeta/$juego".sql.gz "$carpeta/$juego".uploads.tar.gz "$carpeta/$juego".sha256
    log "Rotación: eliminado $juego ($(basename "$carpeta"))"
  done
}
rotar "$DESTINO/diarios" "$DIARIOS_A_CONSERVAR" 'electrosac_*'
rotar "$DESTINO/semanales" "$SEMANALES_A_CONSERVAR" 'electrosac_*'

total="$(du -sh "$DESTINO" | cut -f1)"
log "Fin OK. Espacio total de respaldos: $total · libre en disco: $(df -h "$DESTINO" | awk 'NR==2{print $4}')"
printf 'OK %s — %s\n' "$(date '+%F %T')" "$STAMP" > "$ESTADO"
