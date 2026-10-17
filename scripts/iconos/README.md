# Íconos de Activo360

Son los íconos **reales**, hechos con el logo de la empresa
(`logo-original.jpeg`: la "e" índigo con el rayo). Viven en
`frontend/public/icons/` y los genera `generar-iconos.py` (en esta carpeta).

## Regenerarlos

```
cd ~/Proyecto/Grupo-Activo/Proyecto-Electro
python3 scripts/iconos/generar-iconos.py      # requiere Pillow
cd frontend && npm run build
```

Para cambiar el logo: reemplaza `logo-original.jpeg` (o deja otro archivo y
cambia `ORIGEN` al principio del script) y vuelve a correrlo. Conviene un
PNG grande (512 px o más) con el logo de un solo color sobre fondo claro.

El original actual mide solo **139×139 px** (JPEG). Ampliarlo tal cual
deja el ícono de 512 borroso; por eso el script reconstruye la silueta del
logo y la pinta con un índigo sólido (#2f2479, el color medido en el
original): los bordes quedan nítidos, con las puntas del rayo apenas
redondeadas. En el original la cola del rayo toca el borde izquierdo de
la imagen, así que en los íconos termina en un corte recto.

| Archivo | Tamaño | Para qué | Cómo es |
|---|---|---|---|
| `icon-192.png` | 192×192 | Ícono de la app instalada y `icon` de las notificaciones push | Logo centrado (84 % del lado) sobre blanco |
| `icon-512.png` | 512×512 | Ícono de la app instalada (pantalla de inicio, splash) | Igual |
| `icon-maskable-192.png` | 192×192 | Ícono "adaptable" de Android (lo recorta en círculo, gota…) | Blanco a sangre; logo en el 60 % central (zona segura) |
| `icon-maskable-512.png` | 512×512 | Igual, en grande | Igual |
| `badge-96.png` | 96×96 | Ícono pequeño de la barra de estado en los push | **Silueta blanca sobre transparente**: Android usa solo la transparencia |
| `apple-touch-icon.png` | 180×180 | Ícono al agregar a inicio en iPhone | Logo sobre blanco, sin transparencias |
| `favicon-32.png`, `favicon-48.png` | 32 y 48 | Pestaña del navegador (`frontend/index.html`) | Logo sobre transparente |

Colores relacionados: `frontend/public/manifest.webmanifest`
(`theme_color` #2f2479 = índigo del logo, `background_color` #ffffff) y
`<meta name="theme-color">` en `frontend/index.html`.

Para revisar un ícono maskable: https://maskable.app/editor

## Qué se ve en una notificación push de Android y quién lo decide

| Parte de la notificación | Quién la decide | De dónde sale |
|---|---|---|
| Ícono pequeño en la **barra de estado** (arriba de la pantalla) y en el círculo de la notificación | La página | `badge` en `frontend/public/sw.js` → `badge-96.png`. Android lo pinta de un solo color con la silueta; por eso debe ser blanco sobre transparente. Si no hay `badge` (o es un SVG) Android pone un ícono genérico de Chrome. |
| **Imagen grande** a la derecha | La página | `icon` en `sw.js` → `icon-192.png`. |
| **Nombre e ícono de la aplicación** en la cabecera / a la izquierda | **Android**, no la página | Si la página se usa en Chrome, Android muestra la notificación como de **Chrome** (ícono y nombre de Chrome y, debajo, el dominio). Si la página está **instalada** ("Instalar app" / "Agregar a pantalla de inicio"), Chrome crea una app con el ícono y nombre del manifest, y las notificaciones de las suscripciones hechas **desde la app instalada** salen como **Activo360** con su logo. |
| Título, texto, vibración, a dónde lleva al tocar | La página | `sw.js` y el backend (título y texto del aviso). |

Notas:
- Al instalar la app conviene volver a activar las notificaciones **desde la app instalada** (campana → activar), para que la suscripción quede asociada a ella.
- Android cachea los íconos: después de cambiarlos puede tardar en verse el nuevo, o hay que desinstalar y volver a instalar la app.
- Cada fabricante (Samsung, Xiaomi…) dibuja las notificaciones a su manera; la disposición exacta puede variar.
