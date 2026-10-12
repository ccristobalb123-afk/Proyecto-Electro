#!/usr/bin/env bash
# =====================================================================
# Restaura un respaldo de ElectroSAC en una base de datos VACÍA.
#
#   restaurar.sh RESPALDO.sql.gz BASE_DESTINO [--comparar]
#   restaurar.sh --uploads RESPALDO.uploads.tar.gz CARPETA_DESTINO
#
# Protecciones:
#   - Se niega a restaurar sobre la base de producción (la de backend/.env).
#     Para recuperar producción de verdad, ver el README de esta carpeta.
#   - La base destino debe existir y estar vacía (sin tablas en "public").
#   - Verifica la suma sha256 del respaldo antes de usarlo.
#   - Todo en UNA transacción: si algo falla, la base queda como estaba.
#   - --comparar: cuenta las filas de cada tabla en la base restaurada y
#     en producción (solo lectura) y muestra las diferencias.
#
# Restaurar en OTRO servidor PostgreSQL (otra PC, o uno temporal de prueba):
#   DESTINO_PGHOST=… DESTINO_PGPORT=… DESTINO_PGUSER=… restaurar.sh RESPALDO.sql.gz BASE
# (la contraseña del destino, si la pide, va en ~/.pgpass).
#
# Crear la base de prueba en ESTE servidor (necesita un usuario con
# permiso; el de la app no lo tiene):
#   sudo -u postgres createdb -O electrosac_user electrosac_restore_test
# Borrarla después (la puede borrar su dueño):
#   restaurar.sh --borrar-prueba electrosac_restore_test
# =====================================================================
set -Eeuo pipefail
umask 077
DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_comun.sh
source "$DIR_SCRIPT/_comun.sh"

error() { echo "ERROR: $*" >&2; exit 1; }

verificar_suma() {
  local archivo=$1 sumas
  sumas="${archivo%.sql.gz}"; sumas="${sumas%.uploads.tar.gz}.sha256"
  if [[ -f "$sumas" ]]; then
    (cd "$(dirname "$archivo")" && grep " $(basename "$archivo")\$" "$(basename "$sumas")" | sha256sum -c --quiet -) \
      || error "La suma sha256 de $(basename "$archivo") no coincide: el archivo está dañado."
    echo "Suma sha256 verificada."
  else
    echo "Aviso: no hay archivo .sha256 junto al respaldo; no se pudo verificar la suma."
  fi
}

# ---- Restaurar uploads en una carpeta (nunca encima de la real) ----
if [[ "${1:-}" == "--uploads" ]]; then
  archivo="${2:?Falta el archivo .uploads.tar.gz}"; carpeta="${3:?Falta la carpeta destino}"
  [[ "$(realpath -m "$carpeta")" != "$(realpath -m "$PROYECTO/backend")"* ]] \
    || error "No se restaura directo dentro de backend/: elige otra carpeta y copia a mano lo que necesites."
  verificar_suma "$archivo"
  mkdir -p "$carpeta"
  tar -xzf "$archivo" -C "$carpeta"
  echo "Archivos restaurados en $carpeta/uploads ($(find "$carpeta/uploads" -type f | wc -l) archivos)."
  exit 0
fi

cargar_credenciales_pg

# Conexión al destino: por defecto, el mismo servidor que producción.
en_destino() {
  if [[ -n "${DESTINO_PGHOST:-}${DESTINO_PGPORT:-}${DESTINO_PGUSER:-}" ]]; then
    PGHOST="${DESTINO_PGHOST:-$PGHOST}" PGPORT="${DESTINO_PGPORT:-$PGPORT}" PGUSER="${DESTINO_PGUSER:-$PGUSER}" PGPASSWORD="" "$@"
  else
    "$@"
  fi
}
OTRO_SERVIDOR=""; [[ -n "${DESTINO_PGHOST:-}${DESTINO_PGPORT:-}" ]] && OTRO_SERVIDOR=1

# ---- Borrar la base de prueba ----
if [[ "${1:-}" == "--borrar-prueba" ]]; then
  base="${2:?Falta el nombre de la base de prueba}"
  [[ -n "${DESTINO_PGHOST:-}${DESTINO_PGPORT:-}" || "$base" != "$BASE_PRODUCCION" ]] || error "Esa es la base de producción. No se borra."
  [[ "$base" == *_restore_test || "$base" == *_prueba ]] || error "Por seguridad solo se borran bases que terminen en _restore_test o _prueba."
  PGDATABASE=postgres en_destino psql -X -v ON_ERROR_STOP=1 -q -c "DROP DATABASE \"$base\""
  echo "Base $base eliminada."
  exit 0
fi

archivo="${1:?Uso: restaurar.sh RESPALDO.sql.gz BASE_DESTINO [--comparar]}"
destino="${2:?Falta la base destino}"
comparar="${3:-}"

[[ -f "$archivo" ]] || error "No existe $archivo"
[[ -n "$OTRO_SERVIDOR" || "$destino" != "$BASE_PRODUCCION" ]] || error "Se negó: '$destino' es la base de PRODUCCIÓN. Restaura en una base aparte (ver README)."
gzip -t "$archivo" || error "El archivo está dañado (gzip)."
verificar_suma "$archivo"

existe="$(PGDATABASE=postgres en_destino psql -X -At -c "SELECT 1 FROM pg_database WHERE datname = '$destino'")"
[[ "$existe" == "1" ]] || error "La base '$destino' no existe. Créala primero (ver el encabezado de este script)."
tablas="$(PGDATABASE="$destino" en_destino psql -X -At -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'")"
[[ "$tablas" == "0" ]] || error "La base '$destino' no está vacía ($tablas tablas). No se restaura encima."

echo "Restaurando $(basename "$archivo") en '$destino'…"
zcat "$archivo" | PGDATABASE="$destino" en_destino psql -X -q -v ON_ERROR_STOP=1 --single-transaction > /dev/null
echo "Restauración completa: $(PGDATABASE="$destino" en_destino psql -X -At -c "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'") tablas."

if [[ "$comparar" == "--comparar" ]]; then
  # Conteo exacto de filas por tabla (solo lectura en ambas bases). Cada
  # paso usa ON_ERROR_STOP y se guarda en un archivo para poder revisar
  # su código de salida: un error al contar NUNCA puede pasar por "iguales".
  read -r -d '' contar <<'SQL' || true
SELECT format('SELECT %L || ''|'' || count(*) FROM public.%I;', tablename, tablename)
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
SQL
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  PGDATABASE="$BASE_PRODUCCION" psql -X -At -v ON_ERROR_STOP=1 -c "$contar" > "$tmp/q_prod"
  PGDATABASE="$BASE_PRODUCCION" psql -X -At -v ON_ERROR_STOP=1 -f "$tmp/q_prod" > "$tmp/prod"
  PGDATABASE="$destino" en_destino psql -X -At -v ON_ERROR_STOP=1 -c "$contar" > "$tmp/q_dest"
  PGDATABASE="$destino" en_destino psql -X -At -v ON_ERROR_STOP=1 -f "$tmp/q_dest" > "$tmp/dest"
  n_prod="$(wc -l < "$tmp/prod")"; n_dest="$(wc -l < "$tmp/dest")"
  (( n_prod > 0 )) || error "No se pudo contar ninguna tabla en producción."
  if diff "$tmp/prod" "$tmp/dest" > /dev/null; then
    echo "Comparación OK: las $n_dest tablas tienen exactamente las mismas filas que producción."
    sed 's/^/  /; s/|/: /' "$tmp/dest"
  else
    echo "Comparación: HAY DIFERENCIAS ($n_prod tablas en producción, $n_dest restauradas; < producción | > restaurada):"
    diff "$tmp/prod" "$tmp/dest" || true
    exit 3
  fi
fi
