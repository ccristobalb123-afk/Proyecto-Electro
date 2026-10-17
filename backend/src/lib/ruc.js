// RUC peruano: 11 dígitos, empieza en 10 (persona natural), 15, 16, 17
// o 20 (empresa), y el último es un dígito verificador (módulo 11, con
// los pesos de SUNAT). Así un dígito mal tipeado se detecta al guardar.
// La misma regla está en el frontend (finanzasUtils.js).
const PESOS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

export function rucValido(ruc) {
  if (!/^(10|15|16|17|20)\d{9}$/.test(ruc || "")) return false;
  const suma = PESOS.reduce((total, peso, i) => total + peso * Number(ruc[i]), 0);
  const verificador = (11 - (suma % 11)) % 10;
  return verificador === Number(ruc[10]);
}
