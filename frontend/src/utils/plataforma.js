// Marca <html class="es-ios"> en iPhone, iPod y iPad. Solo ahí los campos
// usan 16px (responsive.css): con menos, Safari amplía la página al tocar
// un campo. El iPad en modo escritorio se presenta como "Macintosh", pero
// a diferencia de una Mac tiene pantalla táctil (maxTouchPoints > 1).
// Se ejecuta antes del primer render (es lo primero que importa main.jsx).
const ua = navigator.userAgent;
const esIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

if (esIOS) {
  document.documentElement.classList.add("es-ios");
}
