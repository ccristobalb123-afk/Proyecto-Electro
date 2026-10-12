# shellcheck shell=bash
# Funciones compartidas por backup.sh y restaurar.sh. Se carga con "source".
#
# Credenciales de PostgreSQL — NUNCA en el script ni en la línea de
# comandos (ahí las vería cualquiera con `ps`):
#   1. Si existe ~/.pgpass (permisos 600) con una línea para este
#      host:puerto:base:usuario, se usa esa (método recomendado).
#   2. Si no, se lee DATABASE_URL de backend/.env y la contraseña se pasa
#      solo como variable de entorno (PGPASSWORD) a pg_dump/psql.
# En ningún caso se escribe la contraseña en el log ni se imprime.

PROYECTO="${PROYECTO:-$HOME/Proyecto/Grupo-Activo/Proyecto-Electro}"
DESTINO="${DESTINO:-$HOME/backups/electrosac}"
ENV_FILE="$PROYECTO/backend/.env"

# Decodifica %xx de una URL (contraseñas con caracteres especiales).
_urldecode() { local s="${1//+/ }"; printf '%b' "${s//%/\\x}"; }

cargar_credenciales_pg() {
  [[ -r "$ENV_FILE" ]] || { echo "No se puede leer $ENV_FILE" >&2; return 1; }
  local linea url
  linea="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1)"
  url="${linea#DATABASE_URL=}"; url="${url%\"}"; url="${url#\"}"; url="${url%\'}"; url="${url#\'}"
  # postgresql://usuario:contraseña@host:puerto/base?parametros
  local re='^postgres(ql)?://([^:@/]+)(:([^@]*))?@([^:/?]+)(:([0-9]+))?/([^?]+)'
  [[ "$url" =~ $re ]] || { echo "DATABASE_URL con formato inesperado en $ENV_FILE" >&2; return 1; }
  export PGUSER="$(_urldecode "${BASH_REMATCH[2]}")"
  export PGHOST="${BASH_REMATCH[5]}"
  export PGPORT="${BASH_REMATCH[7]:-5432}"
  export PGDATABASE="${BASH_REMATCH[8]}"
  BASE_PRODUCCION="$PGDATABASE"

  # ¿Hay entrada en ~/.pgpass para esta conexión? Entonces no hace falta
  # la contraseña del .env.
  local pgpass="${PGPASSFILE:-$HOME/.pgpass}"
  if [[ -f "$pgpass" ]] && grep -qE "^($PGHOST|\*):($PGPORT|\*):($PGDATABASE|\*):$PGUSER:" "$pgpass"; then
    if [[ "$(stat -c %a "$pgpass")" != "600" ]]; then
      echo "$pgpass debe tener permisos 600 (PostgreSQL lo ignora si no)." >&2; return 1
    fi
    unset PGPASSWORD
    METODO_AUTENTICACION="~/.pgpass"
  else
    export PGPASSWORD="$(_urldecode "${BASH_REMATCH[4]}")"
    METODO_AUTENTICACION="backend/.env (variable de entorno)"
  fi
}

tamano() { du -h "$1" | cut -f1; }
