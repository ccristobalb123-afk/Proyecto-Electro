#!/usr/bin/env bash
# =====================================================================
# ¿Cuándo fue la última copia correcta al USB? Se ejecuta como tu usuario.
#
#   comprobar-usb.sh               muestra el estado siempre
#   comprobar-usb.sh --solo-aviso  solo escribe algo si hay que avisar
#
# Código de salida: 0 = al día, 1 = hace más de DIAS_AVISO días (o nunca),
# 2 = error de configuración. Lo llama también backup.sh (log diario y
# --estado).
#
# Configuración: RESPALDO_USB_CONF, si no /etc/respaldo-usb.conf, y si
# todavía no está instalada, la respaldo-usb.conf de esta carpeta.
# =====================================================================
set -euo pipefail

SOLO_AVISO=0
case "${1:-}" in
  --solo-aviso) SOLO_AVISO=1 ;;
  "") ;;
  *) echo "Uso: $0 [--solo-aviso]" >&2; exit 2 ;;
esac

DIR_SCRIPT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="${RESPALDO_USB_CONF:-}"
if [[ -z "$CONF" ]]; then
  if [[ -r /etc/respaldo-usb.conf ]]; then CONF=/etc/respaldo-usb.conf
  else CONF="$DIR_SCRIPT/respaldo-usb.conf"; fi
fi
[[ -r "$CONF" ]] || { echo "No se puede leer $CONF" >&2; exit 2; }
# shellcheck source=respaldo-usb.conf
source "$CONF"
: "${MARCA:?falta MARCA en $CONF}"
DIAS_AVISO="${DIAS_AVISO:-8}"
[[ "$DIAS_AVISO" =~ ^[0-9]+$ ]] || { echo "DIAS_AVISO debe ser un número" >&2; exit 2; }

if [[ ! -r "$MARCA" ]]; then
  echo "AVISO USB: todavía no hay ninguna copia correcta al USB (falta $MARCA)."
  exit 1
fi

read -r epoca fecha hora respaldo < "$MARCA" || true
[[ "${epoca:-}" =~ ^[0-9]+$ ]] || { echo "AVISO USB: la marca $MARCA tiene un formato inesperado."; exit 1; }

dias=$(( ($(date +%s) - epoca) / 86400 ))
if (( dias > DIAS_AVISO )); then
  echo "AVISO USB: hace $dias días que no se copia al USB (última copia correcta: $fecha $hora, respaldo $respaldo). Conéctalo."
  exit 1
fi
(( SOLO_AVISO )) || echo "USB al día: última copia correcta hace $dias día(s) ($fecha $hora, respaldo $respaldo)."
exit 0
