#!/usr/bin/env bash
# =====================================================================
# Pruebas sin root de respaldo-usb.sh (--prueba), comprobar-usb.sh y del
# aviso de backup.sh. Usa SOLO una carpeta temporal propia (mktemp -d) que
# se borra al terminar; no toca ~/backups, ni LUKS, ni discos, ni la BD.
#
#   scripts/backup/usb/pruebas/pruebas-usb.sh            (~40 s)
#   CONSERVAR_TMP=1 scripts/backup/usb/pruebas/pruebas-usb.sh   (no borra la carpeta)
#
# Sale con código 0 si todas las pruebas pasan, 1 si alguna falla.
# =====================================================================
set -uo pipefail
DIR_PRUEBAS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$DIR_PRUEBAS/../.." && pwd)"          # scripts/backup
SCRIPT="$REPO/usb/respaldo-usb.sh"
COMPROBAR="$REPO/usb/comprobar-usb.sh"

BASE="$(mktemp -d "${TMPDIR:-/tmp}/pruebas-respaldo-usb.XXXXXX")"
case "$BASE" in
  "$HOME"/backups|"$HOME"/backups/*) echo "La carpeta temporal no puede estar en ~/backups" >&2; exit 2 ;;
esac
limpiar() { if [[ "${CONSERVAR_TMP:-0}" == 1 ]]; then echo "Carpeta de pruebas conservada: $BASE"; else rm -rf -- "$BASE"; fi; }
trap limpiar EXIT
echo "Carpeta de pruebas: $BASE"

ORIG="$BASE/origen"; USB="$BASE/usb"; CONF="$BASE/prueba.conf"
mkdir -p "$ORIG/diarios" "$ORIG/semanales" "$USB" "$BASE/uploads/sub"
echo hola > "$BASE/uploads/sub/a.txt"

escribir_conf() {  # $1 = copias a conservar
cat > "$CONF" <<EOF
USUARIO="$(id -un)"
UUID_LUKS="00000000-0000-0000-0000-000000000000"
ARCHIVO_LLAVE="/nada"
NOMBRE_MAPPER="prueba"
PUNTO_MONTAJE="$USB"
ORIGEN="$ORIG"
CARPETA_USB="respaldos-electrosac"
COPIAS_A_CONSERVAR=${1:-5}
MIN_LIBRE_PCT=10
DIAS_AVISO=8
LOG_USB="$ORIG/usb.log"
MARCA="$ORIG/USB_ULTIMA_COPIA"
RUTA_LOCK="$BASE/lock"
AVISO_ESCRITORIO=0
AVISO_LED=""
EOF
}
escribir_conf 5
export RESPALDO_USB_CONF="$CONF"
D="$USB/respaldos-electrosac"

OK=0; MAL=0
ok()  { echo "  ✔ $*"; OK=$((OK+1)); }
mal() { echo "  ✘ $*"; MAL=$((MAL+1)); }
check() { local desc=$1; shift; if "$@"; then ok "$desc"; else mal "$desc"; fi; }
correr() { "$SCRIPT" --prueba > "$BASE/salida.txt" 2>&1; RC=$?; }
copias() { find "$D" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort | tr '\n' ' '; }
n_copias() { find "$D" -mindepth 1 -maxdepth 1 -type d -regextype egrep -regex '.*/[0-9-]{10}_[0-9]{6}' | wc -l; }

# Crea un respaldo como backup.sh (diario + semanal el primero de la semana) y rota a 14.
nuevo_respaldo() {  # $1 = fecha AAAA-MM-DD
  local stamp="${1}_030000" t; t="$(mktemp -d "$BASE/tmp.XXXX")"
  head -c 60000 /dev/urandom | base64 > "$t/dump.sql"
  echo "-- PostgreSQL database dump complete" >> "$t/dump.sql"
  gzip -9 < "$t/dump.sql" > "$t/electrosac_$stamp.sql.gz"
  tar -czf "$t/electrosac_$stamp.uploads.tar.gz" -C "$BASE" uploads
  (cd "$t" && sha256sum "electrosac_$stamp.sql.gz" "electrosac_$stamp.uploads.tar.gz") > "$t/electrosac_$stamp.sha256"
  mv "$t"/electrosac_* "$ORIG/diarios/"; rm -rf "$t"
  local sem; sem="$(date -d "$1" +%G-S%V)"
  if ! compgen -G "$ORIG/semanales/electrosac_${sem}_*" >/dev/null; then
    for f in "$ORIG/diarios/electrosac_$stamp".*; do ln "$f" "$ORIG/semanales/electrosac_${sem}_$(basename "$f" | sed 's/^electrosac_//')"; done
  fi
  mapfile -t viejos < <(find "$ORIG/diarios" -name '*.sql.gz' -printf '%f\n' | sed 's/\.sql\.gz$//' | sort -r | tail -n +15)
  for v in "${viejos[@]}"; do rm -f "$ORIG/diarios/$v".*; done
}

echo "== 1. 95 días de diarios, una conexión al día (y dos los domingos)"
fallos_dia=0; repetidas=0
for i in $(seq 95 -1 1); do
  dia="$(date -d "2026-11-12 -$i days" +%F)"
  nuevo_respaldo "$dia"
  correr; [[ $RC == 0 && -d "$D/${dia}_030000" ]] || { fallos_dia=$((fallos_dia+1)); cat "$BASE/salida.txt"; }
  if [[ "$(date -d "$dia" +%u)" == 7 ]]; then
    antes="$(stat -c %Y "$D/${dia}_030000")"; correr
    grep -q "Ya está en el USB" "$BASE/salida.txt" && [[ $RC == 0 && "$(stat -c %Y "$D/${dia}_030000")" == "$antes" ]] && repetidas=$((repetidas+1))
  fi
  (( $(n_copias) <= 5 )) || fallos_dia=$((fallos_dia+1))
done
check "95 copias diarias sin fallos y nunca más de 5 en el USB" test "$fallos_dia" = 0
check "segunda conexión el mismo día no copia nada ($repetidas domingos)" test "$repetidas" -ge 13
check "quedan exactamente las 5 más recientes: $(copias)" test "$(copias)" = "$(for i in 5 4 3 2 1; do printf '%s_030000 ' "$(date -d "2026-11-12 -$i days" +%F)"; done)"
check "cada copia tiene sus 3 archivos y verifica" bash -c "for c in '$D'/*/; do (cd \"\$c\" && sha256sum -c --quiet *.sha256) || exit 1; [ \$(ls \"\$c\" | wc -l) = 3 ] || exit 1; done"
check "marca con la última fecha" grep -q "2026-11-11_030000" "$ORIG/USB_ULTIMA_COPIA"
check "log con verificación, espacio y retención" bash -c "grep -q 'Verificación sha256' '$ORIG/usb.log' && grep -q 'Libre:' '$ORIG/usb.log' && grep -q 'Retención: eliminada' '$ORIG/usb.log'"
check "permisos 600 en las copias" test "$(stat -c %a "$D/2026-11-11_030000/electrosac_2026-11-11_030000.sql.gz")" = 600

estado_usb() { (cd "$USB" && find . -type f -printf '%p %s\n' | sort | md5sum); }

echo "== 2. Poco espacio (simulado): no copia, no borra, no toca la marca"
nuevo_respaldo 2026-11-12
antes="$(estado_usb)"; marca="$(cat "$ORIG/USB_ULTIMA_COPIA")"
PRUEBA_DF_TOTAL=32000000000 PRUEBA_DF_LIBRE=3200050000 correr
check "sale con error" test "$RC" -ne 0
check "mensaje de espacio insuficiente" grep -q "espacio insuficiente" "$BASE/salida.txt"
check "USB intacto" test "$(estado_usb)" = "$antes"
check "marca intacta" test "$(cat "$ORIG/USB_ULTIMA_COPIA")" = "$marca"
PRUEBA_DF_TOTAL=32000000000 PRUEBA_DF_LIBRE=3300000000 correr
check "con espacio justo por encima del 10 % sí copia" test "$RC" = 0 -a -d "$D/2026-11-12_030000"

echo "== 3. .sha256 de origen que no cuadra"
nuevo_respaldo 2026-11-13
sed -i '1s/^[0-9a-f]\{64\}/0000000000000000000000000000000000000000000000000000000000000000/' "$ORIG/diarios/electrosac_2026-11-13_030000.sha256"
antes="$(estado_usb)"; marca="$(cat "$ORIG/USB_ULTIMA_COPIA")"
correr
check "sale con error ($(grep ERROR "$BASE/salida.txt" | head -1 | cut -c1-70)…)" test "$RC" -ne 0
check "USB y marca intactos" test "$(estado_usb)" = "$antes" -a "$(cat "$ORIG/USB_ULTIMA_COPIA")" = "$marca"

echo "== 4. Copia que llega dañada al USB (sha256 no cuadra al releer)"
nuevo_respaldo 2026-11-14
antes="$(estado_usb)"
cp() { command cp "$@" || return; local d="${*: -1}"; [[ "$d" == *.sql.gz ]] && printf 'X' | dd of="$d" bs=1 seek=100 conv=notrunc status=none; return 0; }
export -f cp; correr; unset -f cp
check "sale con error de verificación sha256" bash -c "[ $RC -ne 0 ] && grep -q 'verificación sha256' '$BASE/salida.txt'"
check "no se aplicó retención (USB igual que antes) y no queda .en-curso" test "$(estado_usb)" = "$antes"
check "no hay carpeta 2026-11-14 en el USB" test ! -e "$D/2026-11-14_030000"

echo "== 5. gzip dañado pero sha256 coherente (gzip -t debe detectarlo)"
cp() { command cp "$@" || return; local d="${*: -1}"
  if [[ "$d" == *.uploads.tar.gz ]]; then printf 'XXXXXXXX' | dd of="$d" bs=1 seek=200 conv=notrunc status=none; fi
  if [[ "$d" == *.sha256 ]]; then (cd "$(dirname "$d")" && sha256sum electrosac_*.sql.gz electrosac_*.uploads.tar.gz > "$d"); fi; return 0; }
export -f cp; correr; unset -f cp
check "sale con error de gzip -t" bash -c "[ $RC -ne 0 ] && grep -q 'gzip -t falló' '$BASE/salida.txt'"
check "USB intacto" test "$(estado_usb)" = "$antes"

echo "== 6. Fallo a mitad (USB retirado durante la copia) y repetición"
cp() { [[ "${*: -1}" == *.uploads.tar.gz ]] && { echo "cp: error writing: Input/output error" >&2; return 1; }; command cp "$@"; }
export -f cp; correr; unset -f cp
check "sale con error" test "$RC" -ne 0
check "USB intacto, sin restos .en-curso" test "$(estado_usb)" = "$antes" -a -z "$(find "$D" -name '.en-curso-*')"
check "marca intacta" test "$(cat "$ORIG/USB_ULTIMA_COPIA")" = "$marca"
correr
check "la siguiente conexión copia bien 2026-11-14 y deja 5" test "$RC" = 0 -a -d "$D/2026-11-14_030000" -a "$(n_copias)" = 5

echo "== 7. SIGTERM a mitad (systemctl stop / apagado)"
nuevo_respaldo 2026-11-15
antes="$(estado_usb)"
cp() { command cp "$@"; [[ "${*: -1}" == *.sql.gz ]] && sleep 3; return 0; }
export -f cp
"$SCRIPT" --prueba > "$BASE/salida.txt" 2>&1 & pid=$!
sleep 1.5; kill -TERM "$pid"; wait "$pid"; RC=$?; unset -f cp
check "sale con código 130 ($RC)" test "$RC" = 130
check "USB intacto y sin .en-curso" test "$(estado_usb)" = "$antes"
check "log dice interrumpido" grep -q "interrumpido por una señal" "$BASE/salida.txt"
mkdir -p "$D/.en-curso-2020-01-01_000000"; echo basura > "$D/.en-curso-2020-01-01_000000/x"
correr
check "repetición OK y limpia restos .en-curso de un intento anterior" bash -c "[ $RC = 0 ] && [ -d '$D/2026-11-15_030000' ] && [ ! -e '$D/.en-curso-2020-01-01_000000' ] && grep -q 'copia incompleta de un intento anterior' '$BASE/salida.txt'"

echo "== 8. El más reciente solo existe como semanal (nombres normalizados)"
nuevo_respaldo 2026-11-16   # lunes → también semanal
rm -f "$ORIG/diarios/electrosac_2026-11-16_030000".*
correr
check "copia el semanal con nombres de diario y verifica" bash -c "[ $RC = 0 ] && cd '$D/2026-11-16_030000' && sha256sum -c --quiet electrosac_2026-11-16_030000.sha256 && ls | grep -q '^electrosac_2026-11-16_030000.sql.gz$'"

echo "== 9. Retención configurable (COPIAS_A_CONSERVAR=3)"
escribir_conf 3; nuevo_respaldo 2026-11-17; correr
check "quedan 3: $(copias)" test "$(n_copias)" = 3 -a -d "$D/2026-11-17_030000"
escribir_conf 5

echo "== 10. .sha256 con nombres que no corresponden"
nuevo_respaldo 2026-11-18
sed -i 's/electrosac_2026-11-18_030000.sql.gz/otro.sql.gz/' "$ORIG/diarios/electrosac_2026-11-18_030000.sha256"
antes="$(estado_usb)"; correr
check "error y USB intacto" bash -c "[ $RC -ne 0 ] && grep -q 'no lista' '$BASE/salida.txt'"
check "USB intacto" test "$(estado_usb)" = "$antes"
rm -f "$ORIG/diarios/electrosac_2026-11-18_030000".* "$ORIG/semanales/"*2026-11-18*

echo "== 11. Sin respaldos de origen y configuración inválida"
mv "$ORIG/diarios" "$ORIG/d0"; mv "$ORIG/semanales" "$ORIG/s0"; correr
check "error «no hay ningún respaldo»" bash -c "[ $RC -ne 0 ] && grep -q 'no hay ningún respaldo' '$BASE/salida.txt'"
mv "$ORIG/d0" "$ORIG/diarios"; mv "$ORIG/s0" "$ORIG/semanales"
sed -i 's/^COPIAS_A_CONSERVAR=.*/COPIAS_A_CONSERVAR=0/' "$CONF"; correr
check "COPIAS_A_CONSERVAR=0 se rechaza (código 2)" test "$RC" = 2
escribir_conf 5
check "modo real sin root se niega" bash -c "'$SCRIPT' >/dev/null 2>&1; [ \$? -ne 0 ]"

echo "== 12. Bloqueo: dos a la vez"
cp() { command cp "$@"; sleep 1; }; export -f cp
nuevo_respaldo 2026-11-19
"$SCRIPT" --prueba > "$BASE/s1.txt" 2>&1 & p1=$!
sleep 0.5; "$SCRIPT" --prueba > "$BASE/s2.txt" 2>&1; r2=$?; wait "$p1"; r1=$?; unset -f cp
check "la segunda sale sin hacer nada (rc=$r2) y la primera copia (rc=$r1)" bash -c "[ $r1 = 0 ] && [ $r2 = 0 ] && grep -q 'ya hay otra copia' '$BASE/s2.txt'"

echo "== 13. comprobar-usb.sh"
printf '%s %s %s\n' "$(date -d '-9 days' +%s)" "$(date -d '-9 days' '+%F %T')" X > "$ORIG/USB_ULTIMA_COPIA"
s="$("$COMPROBAR" --solo-aviso)"; r=$?
check "9 días → aviso «$s» (rc=$r)" bash -c "[ $r = 1 ] && grep -q 'hace 9 días que no se copia al USB' <<< '$s'"
printf '%s %s %s\n' "$(date -d '-8 days' +%s)" "$(date -d '-8 days' '+%F %T')" X > "$ORIG/USB_ULTIMA_COPIA"
s="$("$COMPROBAR" --solo-aviso)"; r=$?
check "8 días → sin aviso (rc=$r, salida vacía)" test "$r" = 0 -a -z "$s"
rm -f "$ORIG/USB_ULTIMA_COPIA"; s="$("$COMPROBAR")"; r=$?
check "sin marca → aviso (rc=$r)" bash -c "[ $r = 1 ] && grep -q 'todavía no hay' <<< '$s'"

echo "== 14. backup.sh: --estado y aviso en el log (sin tocar la BD)"
mkdir -p "$BASE/destino"; echo "OK prueba" > "$BASE/destino/ULTIMO_ESTADO"
printf '%s %s %s\n' "$(date -d '-12 days' +%s)" "$(date -d '-12 days' '+%F %T')" X > "$ORIG/USB_ULTIMA_COPIA"
s="$(DESTINO="$BASE/destino" "$REPO/backup.sh" --estado 2>&1)"
check "--estado muestra el aviso de 12 días" grep -q "hace 12 días" <<< "$s"
# aviso_usb() tal cual está en backup.sh:
s="$(DIR_SCRIPT="$REPO" bash -c "set -Eeuo pipefail; trap 'echo ERR-TRAP' ERR; $(sed -n '/^COMPROBAR_USB=/,/^}/p' "$REPO/backup.sh"); aviso=\"\$(aviso_usb)\"; echo \"[\$aviso]\"")"
check "aviso_usb devuelve el aviso sin disparar el trap ERR" bash -c "grep -q '^\[AVISO USB: hace 12 días' <<< '$s' && ! grep -q ERR-TRAP <<< '$s'"
printf '%s %s %s\n' "$(date +%s)" "$(date '+%F %T')" X > "$ORIG/USB_ULTIMA_COPIA"
s="$(DIR_SCRIPT="$REPO" bash -c "set -Eeuo pipefail; trap 'echo ERR-TRAP' ERR; $(sed -n '/^COMPROBAR_USB=/,/^}/p' "$REPO/backup.sh"); aviso=\"\$(aviso_usb)\"; echo \"[\$aviso]\"")"
check "al día → aviso_usb vacío y sin trap ERR ($s)" test "$s" = "[]"

echo
echo "RESULTADO: $OK correctas, $MAL fallidas"
(( MAL == 0 ))
