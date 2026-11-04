# Propuesta de diseño visual — reporte

Propuesta en tres variantes (la C está al final), **sin aplicar a la app** (no se tocó `src/` ni `tokens.css`).

- Muestras: `variante-a.html` (conservadora) y `variante-b.html` (marcada). Cargan
  `src/styles/tokens.css` real y encima `tokens-a.css` / `tokens-b.css`, que solo
  reemplazan los valores que cambiarían. Los componentes están en `propuesta.css`.
  No entran al build: Vite y Tailwind solo leen `src/`.
- Capturas: `variante-a-360.png`, `variante-a-1280.png`, `variante-b-360.png`,
  `variante-b-1280.png` (en 360 el menú se muestra abierto arriba, como el cajón
  del celular).
- Para verlas en el navegador hay que abrirlas desde un servidor local con raíz en
  `frontend/` (ej. `python3 -m http.server -d frontend`), porque leen `../../src/styles/tokens.css`.
- Todos los nombres y números son de ejemplo (la lámina lo dice arriba).

## Qué tomé de las referencias

| Rasgo | Cómo quedó |
|---|---|
| Esquinas bien redondeadas | Tarjetas 16 px (A) / 20 px (B); botones 10 / 12 px. |
| Sombras suaves | Sombra doble y difusa en tarjetas; en B, teñida del navy y con sombra de color en el botón principal y el menú activo. |
| Rótulo pequeño en mayúsculas + título pesado | «RESUMEN / Dashboard general», «OPERACIONES / Equipos» y la categoría del equipo. B: títulos 30 px / 700 y rótulo de la tarjeta en color. |
| Tarjeta de resumen con ícono en cuadro de color suave y número grande | Rótulo arriba, número grande debajo, ícono a la derecha en un cuadro con el tinte. B: número 34 px en Space Grotesk y, si es un estado, en su color. |
| Menú con el activo en píldora | A: píldora con el azul translúcido; B: píldora sólida azul con texto blanco. |
| Colores en bloques sólidos y saturados | B: etiquetas de estado sólidas (texto blanco) y botón y menú en azul sólido. |

## Qué adapté y por qué

- **Paleta:** no usé ningún color de las referencias. Medí su saturación y
  luminosidad y moví cada token de la app en esa dirección, **sin cambiar el tono**
  (azul, rojo, verde, ámbar y gris-azul siguen siendo los mismos).
- **Medición:** saturación en HSL y luminosidad en OKLab (perceptual). En HSL un
  verde y un azul con el mismo L % no se ven igual de claros; por eso los rellenos,
  rótulos y textos conservan su luminosidad y solo suben de saturación.
  - Rellenos sólidos de las referencias: S 89–100 %. Textos oscuros: S 87–100 %, casi
    negros con color. Barra lateral: navy puro (S 100 %). Fondos: S 33–40 %, L 96–98 %.
  - A = mitad del camino entre el valor actual y el de las referencias; B = el de las
    referencias.
- **Tintes de estado sin cambio** (`--success-tint`, `--danger-tint`, `--volt-tint`):
  en las referencias los tintes son **más suaves y claros** que los de la app.
  Acercarlos hacía que verde, rojo y ámbar se parecieran (con daltonismo
  rojo-verde, la diferencia entre el tinte verde y el rojo bajaba de 0.027 a 0.006).
  El tinte azul (`--copper-tint`) sí se suaviza, porque no es un estado.
- **El ámbar ya no marca el menú activo:** hoy el activo es ámbar; como el ámbar es
  de estado, pasa al azul de acción. El ámbar queda en «360» y en estados.
- **«Contratos por vencer» en ámbar** (hoy es azul): es justamente un «por vencer».
  Es una propuesta: si no la quieres, vuelve al azul sin tocar nada más.
- **Sin fotos:** las fotos del equipo son los cuadros vacíos que ya usa la app.
- **Número del resumen:** A mantiene JetBrains Mono (cambio sutil); B usa Space
  Grotesk 700, más parecido al número grande de las referencias.
- **Tarjeta de equipo en B:** borde fino de 1 px y la sombra la separa del fondo. A
  conserva el borde de 2 px (`--border-control`) que se puso hace poco.
- **No copié** textos, marcas, logotipos, fotos ni íconos de las referencias: los
  íconos son los de la app (`Icons.jsx`).

## Colores: actual → propuesto

Solo los tokens que cambian. Entre paréntesis, saturación y luminosidad HSL.

| Token | Actual | A (mitad del camino) | B (como las referencias) |
|---|---|---|---|
| `--copper` | `#2563eb` (S 83% · L 53%) | `#1e61f2` (S 89% · L 53%) | `#185ef9` (S 95% · L 54%) |
| `--danger` | `#dc2626` (S 72% · L 51%) | `#e11414` (S 84% · L 48%) | `#e40606` (S 95% · L 46%) |
| `--success` | `#16a34a` (S 76% · L 36%) | `#0ca444` (S 86% · L 35%) | `#04a43f` (S 95% · L 33%) |
| `--volt` | `#f59e0b` (S 92% · L 50%) | `#f59e09` (S 93% · L 50%) | `#f69e08` (S 94% · L 50%) |
| `--copper-dark` | `#1d4ed8` (S 76% · L 48%) | `#1e4fd7` (S 76% · L 48%) | `#1f4ed6` (S 75% · L 48%) |
| `--danger-dark` | `#991b1b` (S 70% · L 35%) | `#9a1919` (S 72% · L 35%) | `#9a1616` (S 75% · L 35%) |
| `--success-dark` | `#166534` (S 64% · L 24%) | `#126632` (S 70% · L 24%) | `#0f6630` (S 74% · L 23%) |
| `--volt-dark` | `#92400e` (S 82% · L 31%) | `#914111` (S 79% · L 32%) | `#8f4314` (S 75% · L 32%) |
| `--copper-tint` | `#dbeafe` (S 95% · L 93%) | `#e2ecfb` (S 76% · L 94%) | `#e8f0f9` (S 59% · L 94%) |
| `--ink` | `#243447` (S 33% · L 21%) | `#142943` (S 54% · L 17%) | `#09203a` (S 73% · L 13%) |
| `--ink-2` | `#1b2836` (S 33% · L 16%) | `#0c1928` (S 54% · L 10%) | `#061425` (S 72% · L 8%) |
| `--text` | `#1f2937` (S 28% · L 17%) | `#0c1c33` (S 62% · L 12%) | `#011025` (S 95% · L 7%) |
| `--muted` | `#4b5769` (S 17% · L 35%) | `#4e5764` (S 12% · L 35%) | `#505760` (S 9% · L 35%) |
| `--muted-2` | `#5c687d` (S 15% · L 43%) | `#5e6878` (S 12% · L 42%) | `#616773` (S 8% · L 42%) |
| `--paper` | `#eaeef2` (S 24% · L 93%) | `#eff3f6` (S 28% · L 95%) | `#f5f8fa` (S 33% · L 97%) |
| `--border` | `#dce2e8` (S 21% · L 89%) | `#dfe4e8` (S 16% · L 89%) | `#e3e6e8` (S 10% · L 90%) |
| `--on-ink` | `#edeae2` (S 23% · L 91%) | `#ebeae6` (S 11% · L 91%) | `#ebebeb` (S 0% · L 92%) |
| `--on-ink-soft` | `#b9c2cc` (S 16% · L 76%) | `#afc3da` (S 37% · L 77%) | `#a5c5e8` (S 59% · L 78%) |
| `--on-ink-muted` | `#93a0ae` (S 14% · L 63%) | `#81a2c5` (S 37% · L 64%) | `#6fa2da` (S 59% · L 65%) |
| `--on-ink-accent` | `#f3d889` (S 82% · L 75%) | `#f6d77d` (S 87% · L 73%) | `#fad66e` (S 93% · L 71%) |

Casi no cambian `--volt`, `--copper-dark`, `--danger-dark` y `--volt-dark`: su saturación
ya es la de las referencias (~75 % en rótulos de color, ~94 % en el ámbar). `--muted`,
`--muted-2`, `--border` y `--on-ink` **bajan** un poco de saturación, porque en las
referencias los grises de apoyo son más neutros. Lo que más cambia es la barra lateral
(`--ink`, de gris-azul a navy) y el texto (`--text`, casi negro con un toque de azul).

Sin cambio: `--danger-tint`, `--success-tint`, `--volt-tint`, `--electro`,
`--electro-dark`, `--electro-tint`, `--gray-tint`, `--gray-dark`, `--border-control`, `--card`.

### Contraste (AA)

Si algún color no llegaba al mínimo, se corregía solo su luminosidad. Ninguno lo necesitó.

| Par | Actual | A | B | Mínimo |
|---|---|---|---|---|
| copper sobre blanco | 5.17 | 5.19 | 5.24 | 4.5 |
| copper-dark sobre blanco | 6.7 | 6.66 | 6.73 | 4.5 |
| danger sobre blanco | 4.83 | 4.87 | 4.85 | 4.5 |
| text sobre (peor fondo) | 12.59 | 15.31 | 17.87 | 7 |
| muted sobre (peor fondo) | 5.94 | 5.93 | 5.93 | 4.5 |
| muted-2 sobre (peor fondo) | 4.57 | 4.57 | 4.61 | 4.5 |
| on-ink-soft sobre (peor fondo) | 7.03 | 8.15 | 9.19 | 7 |
| on-ink-muted sobre (peor fondo) | 4.76 | 5.54 | 6.14 | 4.5 |
| border-control sobre (peor fondo) paper | 3.16 | 3.3 | 3.45 | 3 |
| success-dark sobre su tinte | 6.49 | 6.43 | 6.45 | 4.5 |
| danger-dark sobre su tinte | 6.8 | 6.8 | 6.88 | 4.5 |
| volt-dark sobre su tinte | 6.37 | 6.35 | 6.33 | 4.5 |

Además: texto blanco sobre el azul del menú activo de B: 5.24; texto claro sobre la
píldora de A: 9.54. Etiquetas sólidas de B: blanco sobre verde oscuro 7.09, sobre rojo
oscuro 8.40, sobre gris-azul 10.35.

`--volt` (ámbar) tiene 2.1:1 sobre blanco hoy y en las dos variantes: no se usa como
texto. Los números ámbar de B usan `--volt-dark`.

### Verde, rojo y ámbar distinguibles

Diferencia de color (ΔE en OKLab; mayor = más distinto). Primer valor: visión normal;
segundo: con deuteranopía (daltonismo rojo-verde, simulado). Ningún par baja de lo
que hay hoy de forma apreciable, y los estados además llevan texto y punto.

| Par | Actual | A | B |
|---|---|---|---|
| success/danger | 0.341 / 0.05 | 0.356 / 0.054 | 0.363 / 0.048 |
| success/volt | 0.256 / 0.175 | 0.258 / 0.169 | 0.261 / 0.169 |
| danger/volt | 0.241 / 0.191 | 0.245 / 0.189 | 0.246 / 0.187 |
| success-dark/danger-dark | 0.24 / 0.04 | 0.245 / 0.039 | 0.249 / 0.037 |
| success-dark/volt-dark | 0.187 / 0.062 | 0.187 / 0.056 | 0.184 / 0.052 |
| danger-dark/volt-dark | 0.067 / 0.028 | 0.07 / 0.026 | 0.076 / 0.028 |
| success-tint/danger-tint | 0.075 / 0.027 | 0.075 / 0.027 | 0.075 / 0.027 |
| success-tint/volt-tint | 0.053 / 0.043 | 0.053 / 0.043 | 0.053 / 0.043 |
| danger-tint/volt-tint | 0.065 / 0.054 | 0.065 / 0.054 | 0.065 / 0.054 |

## Forma, sombra y letra

Los espaciados no cambian de valor (`--space-*` sigue igual): cambia cuál usa cada
pieza (tarjetas con `--space-5`, 20 px, en vez de 18 px fijos). Los marcados «nuevo
token» hoy están escritos a mano en cada CSS; al aplicar la variante pasarían a
`tokens.css`.

### Variante A · conservadora

| Token | Actual | Variante A | Para qué |
|---|---|---|---|
| `--radius` | 8px | `10px` | radio de botones, campos y cuadros chicos |
| `--radius-lg` | 12px | `16px` | radio de tarjetas |
| `--radius-nav` | 8px (fijo en AppShell.css) | `10px` | radio del elemento del menú (nuevo token) |
| `--radius-boton` | 8px / 7px (fijos) | `10px` | radio de botones (nuevo token) |
| `--radius-pill` | 12px (fijo) | `999px` | etiquetas de estado (nuevo token) |
| `--radius-avatar` | 50% (fijo) | `50%` | avatar (nuevo token) |
| `--shadow-sm` | 0 1px 2px rgba(16, 24, 40, 0.05) | `0 1px 2px rgba(16, 24, 40, 0.04), 0 2px 6px -1px rgba(16, 24, 40, 0.07)` | sombra de tarjetas: algo más de cuerpo |
| `--shadow-boton` | — (no existe) | `none` | sombra del botón principal (nuevo token) |
| `--borde-tarjeta` | igual | `var(--borde-tarjeta-ancho) solid var(--borde-tarjeta-color)` | tarjeta de equipo: sin cambio (2px, --border-control) |
| `--fs-rotulo` | — | `11px` | rótulos en mayúsculas (nuevo token) |
| `--fw-rotulo` | — | `600` | peso de los rótulos (nuevo token) |
| `--tracking-rotulo` | — | `0.06em` | espaciado entre letras de rótulos (nuevo token) |
| `--fs-titulo` | 16px (título de la barra superior) | `22px` | títulos de página/sección (nuevo token) |
| `--fw-titulo` | 600 | `600` | peso de títulos (nuevo token) |
| `--fw-titulo-tarjeta` | 600 | `600` | nombre del equipo (nuevo token) |
| `--font-kpi` | JetBrains Mono (fijo) | `var(--font-mono)` | letra del número del resumen (nuevo token) |
| `--fs-kpi` | 26px (fijo) | `28px` | número del resumen (nuevo token) |
| `--fs-kpi-movil` | 26px (fijo) | `24px` | número del resumen en celular (nuevo token) |
| `--fw-kpi` | 600 | `600` | peso del número (nuevo token) |
| `--kpi-icono` | 34px (fijo) | `36px` | cuadro del ícono del resumen (nuevo token) |

### Variante B · marcada

| Token | Actual | Variante B | Para qué |
|---|---|---|---|
| `--radius` | 8px | `12px` | radio de botones, campos y cuadros chicos |
| `--radius-lg` | 12px | `20px` | radio de tarjetas |
| `--radius-nav` | 8px (fijo en AppShell.css) | `999px` | elemento activo del menú en píldora (nuevo token) |
| `--radius-boton` | 8px / 7px (fijos) | `12px` | radio de botones (nuevo token) |
| `--radius-pill` | 12px (fijo) | `999px` | etiquetas de estado (nuevo token) |
| `--radius-avatar` | 50% (fijo) | `12px` | avatar en cuadro redondeado (nuevo token) |
| `--shadow-sm` | 0 1px 2px rgba(16, 24, 40, 0.05) | `0 1px 2px rgba(9, 32, 58, 0.05), 0 8px 24px -8px rgba(9, 32, 58, 0.14)` | sombra suave y amplia, teñida del navy |
| `--shadow-boton` | — (no existe) | `0 6px 16px -6px color-mix(in srgb, var(--copper) 60%, transparent)` | sombra de color en el botón principal y el menú activo (nuevo token) |
| `--borde-tarjeta` | 2px solid var(--border-control) | `1px solid var(--border)` | tarjeta de equipo: borde fino; la separa la sombra |
| `--fs-rotulo` | — | `11.5px` | rótulos en mayúsculas (nuevo token) |
| `--fw-rotulo` | — | `700` | peso de los rótulos (nuevo token) |
| `--tracking-rotulo` | — | `0.08em` | espaciado entre letras de rótulos (nuevo token) |
| `--fs-titulo` | 16px (título de la barra superior) | `30px` | títulos de página/sección (nuevo token) |
| `--fw-titulo` | 600 | `700` | peso de títulos (nuevo token) |
| `--fw-titulo-tarjeta` | 600 | `700` | nombre del equipo (nuevo token) |
| `--font-kpi` | JetBrains Mono (fijo) | `var(--font-display)` | número del resumen en Space Grotesk (nuevo token) |
| `--fs-kpi` | 26px (fijo) | `34px` | número del resumen (nuevo token) |
| `--fs-kpi-movil` | 26px (fijo) | `28px` | número del resumen en celular (nuevo token) |
| `--fw-kpi` | 600 | `700` | peso del número (nuevo token) |
| `--kpi-icono` | 34px (fijo) | `44px` | cuadro del ícono del resumen (nuevo token) |

---

# Variante C · azul marino

`variante-c.html` + `tokens-c.css`. Capturas: `variante-c-360.png` y `variante-c-1280.png`.
Es la B con la barra lateral y la acción en azul marino. `tokens-c.css` no depende de
`tokens-b.css`: lista todo lo que cambiaría respecto de la app.

Además de las piezas de A y B, la muestra incluye **(d) la galería de botones** y **(e) los
otros usos del color de acción** (enlace, pestaña activa, aro de foco, opción elegida y
ícono de carga). En la galería, el hover, el presionado y el foco están forzados con
clases para verlos sin interactuar.

## Azul marino elegido

| Uso | Hex | Tono · saturación · luminosidad |
|---|---|---|
| Barra lateral (`--ink`) | **`#081c49`** | 222° · S 80 % · L 16 % |
| Botón principal, aro de foco, ícono de carga (`--copper`) | **`#153684`** | 222° · S 73 % · L 30 % |
| Hover y presionado; texto de enlaces y pestañas (`--copper-dark`) | **`#0c255f`** | 222° · S 78 % · L 21 % |
| Píldora del menú activo (`--nav-activo`, nuevo) | **`#2b65ee`** | 222° · S 85 % · L 55 % |

- **La barra (`#081c49`)** es mucho más saturada que el `#142943` de A (S 54 %).
- **El botón (`#153684`)** es un poco más claro que la barra, para que no se confunda con
  ella (1.49:1 entre los dos).
- **La píldora del menú activo** no puede ser del mismo navy: no se vería sobre la barra.
  Es un azul de la misma familia, elegido para que el texto blanco tenga AA (5.0:1) y la
  píldora se separe de la barra (3.3:1).
- **El avatar del usuario** en la app usa `--copper` de fondo. En C sería navy sobre
  navy, así que en la muestra usa `--nav-activo`. Habría que hacer ese cambio al aplicarla.

### Estados del botón principal

| Estado | Cómo se ve |
|---|---|
| Normal | Fondo `--copper` `#153684`, texto blanco, sombra de color. |
| Hover | Fondo `--copper-dark` `#0c255f` (igual que hoy: el hover oscurece). |
| Presionado | `--copper-dark`, se achica al 97 % y pierde la sombra (como el botón del Login hoy). |
| Foco visible | Aro de 2 px `--copper`, separado 2 px (la regla global de la app). |
| Deshabilitado | Opacidad 0.6 (como hoy). |
| Cargando | Ícono girando + «Guardando…», color normal y cursor de espera (como `BotonCarga`). |

## Colores: actual → propuesto (C)

| Token | Actual | C |
|---|---|---|
| `--ink` | `#243447` (213° · S 33% · L 21%) | **`#081c49`** (222° · S 80% · L 16%) |
| `--ink-2` | `#1b2836` (211° · S 33% · L 16%) | **`#051333`** (222° · S 82% · L 11%) |
| `--copper` | `#2563eb` (221° · S 83% · L 53%) | **`#153684`** (222° · S 73% · L 30%) |
| `--copper-dark` | `#1d4ed8` (224° · S 76% · L 48%) | **`#0c255f`** (222° · S 78% · L 21%) |
| `--copper-tint` | `#dbeafe` (214° · S 95% · L 93%) | **`#e5ebfa`** (223° · S 68% · L 94%) |
| `--nav-activo` (nuevo) | — | **`#2b65ee`** (222° · S 85% · L 55%) |
| `--danger` | `#dc2626` | `#e40606` (igual que B) |
| `--success` | `#16a34a` | `#04a43f` (igual que B) |
| `--volt` | `#f59e0b` | `#f69e08` (igual que B) |
| `--danger-dark` | `#991b1b` | `#9a1616` (igual que B) |
| `--success-dark` | `#166534` | `#0f6630` (igual que B) |
| `--volt-dark` | `#92400e` | `#8f4314` (igual que B) |
| `--text` | `#1f2937` | `#011025` (igual que B) |
| `--muted` | `#4b5769` | `#505760` (igual que B) |
| `--muted-2` | `#5c687d` | `#616773` (igual que B) |
| `--paper` | `#eaeef2` | `#f5f8fa` (igual que B) |
| `--border` | `#dce2e8` | `#e3e6e8` (igual que B) |
| `--on-ink` | `#edeae2` | `#ebebeb` (igual que B) |
| `--on-ink-soft` | `#b9c2cc` | `#a5c5e8` (igual que B) |
| `--on-ink-muted` | `#93a0ae` | `#6fa2da` (igual que B) |
| `--on-ink-accent` | `#f3d889` | `#fad66e` (igual que B) |

**Sin cambio:** los tintes de estado (`--success-tint`, `--danger-tint`, `--volt-tint`, igual
que en A y B), `--electro*`, `--gray-*`, `--border-control` y `--card`.

**Rojo, verde y ámbar:** «sin cambio» lo tomé respecto de B. Quedan con los valores
saturados de B, que son los mismos tonos de la app, un poco más vivos. Si preferías los
valores de hoy, basta con quitar esas 6 líneas de `tokens-c.css`.

**Botones secundarios y de borde:** conservan sus colores. Toman el radio de la variante
(12 px) para que la galería sea coherente.

**Tarjeta de equipo:** 2 px con `--border-control`, como hoy en la app (`tokens-c.css`
no toca `--borde-tarjeta`).

## Contrastes medidos (C)

| Par | C | Hoy en la app | Mínimo |
|---|---|---|---|
| Texto blanco sobre el botón principal (normal) | 11.1 | 5.17 | 4.5 |
| Texto blanco sobre hover / presionado (`--copper-dark`) | 14.53 | 6.7 | 4.5 |
| Texto blanco sobre la píldora del menú activo | 5.0 | — | 4.5 |
| Píldora del menú activo contra la barra lateral | 3.3 | — | 3 (no texto) |
| Botón principal contra la barra lateral (solo informativo) | 1.49 | — | — |
| Texto del menú (`--on-ink-soft`) sobre la barra | 9.23 | 7.03 | 4.5 |
| Rótulo del menú (`--on-ink-muted`) sobre la barra | 6.17 | 4.76 | 4.5 |
| «360» ámbar (`--volt`) sobre la barra | 7.71 | 5.9 | 3 (texto grande) |
| Aro de foco (`--copper`) sobre blanco | 11.1 | 5.17 | 3 (no texto) |
| Aro de foco sobre el fondo de página (`--paper`) | 10.4 | 4.43 | 3 (no texto) |
| Enlace (`--copper-dark`) sobre blanco | 14.53 | 6.7 | 4.5 |
| Enlace sobre el fondo de página | 13.62 | 5.75 | 4.5 |
| Pestaña activa (`--copper-dark` sobre `--copper-tint`) | 12.17 | 5.49 | 4.5 |
| Borde del botón «primario» (`--copper`) sobre blanco | 11.1 | 5.17 | 3 (no texto) |
| Ícono de carga (`--copper`) sobre blanco | 11.1 | 5.17 | 3 (no texto) |
| Peligro: blanco sobre `--danger` | 4.85 | 4.83 | 4.5 |
| Peligro hover: blanco sobre `--danger-dark` | 8.4 | 8.31 | 4.5 |
| Borde rojo: texto `--danger` sobre blanco | 4.85 | 4.83 | 4.5 |
| Secundario: `--muted` sobre blanco | 7.31 | 7.33 | 4.5 |

Deshabilitado (opacidad 0.6 sobre blanco, se ve `#7386b5`): blanco sobre él 3.62:1. WCAG no exige contraste a los controles deshabilitados.
Enlace frente al texto normal (`--text`): 1.31:1. Como son casi igual de oscuros, el enlace se distingue por el subrayado, que `.link-button` ya tiene (hoy: 2.19:1).

## Dónde usa la app el color de acción

Aplicar C cambia todos estos lugares. Están agrupados por para qué sirven; entre
paréntesis, el archivo.

**`--copper` (33 usos en CSS + 1 en JS):**
- **Botón principal:** `.btn-primary` (`styles/tokens.css`), `.btn-seguir-conectado` del aviso de
  inactividad (`AvisoInactividad.css`).
- **Aro de foco:** `input:focus-visible, button:focus-visible` (`tokens.css`), buscador
  `.search:focus-within` (`AppShell.css`), `a.row-item:focus-visible` (`Dashboard.css`),
  `.persona-cursos__cabecera:focus-visible` (`fichas.css`).
- **Avatar del usuario:** `.avatar` (`AppShell.css`). Quedaría navy sobre navy; ver arriba.
- **Opciones elegidas (borde):**
  - `.destino-choice` (`Asignacion.css`).
  - `.co-choice .sel-corevex` y `.igv-choice .sel` (`Modal.css`).
  - `.rol-choice`, `.empresas-check` y `.modulos-check` (`Administracion.css`).
  - `.tipo-check--caja` (`Operaciones.css`).
  - `.doc-vehiculo--marcado` (`Modal.css`), con su casilla (`accent-color`).
- **Hover de controles (borde):** `.menu-acciones__boton` (`MenuAcciones.css`),
  `.notificaciones-bell__boton` (`NotificacionesBell.css`), `.dropzone` y
  `label.foto-equipo-vacio` (`Modal.css`), flecha de `.persona-cursos` (`fichas.css`).
- **Otros elementos activos o resaltados:**
  - Botón de menú activo `.menu-acciones__boton--activo` (`MenuAcciones.css`).
  - Ficha abierta `.persona-cursos--abierta`, con borde y franja izquierda (`fichas.css`).
  - `.registro-ficha--coincide` (`fichas.css`).
  - Punto de la línea de tiempo `.tl-dot` (`Modal.css`).
- **Botón de borde «primario»:** `.btn-outline-sm--primario` (`buttons.css`).
- **Íconos y textos:** spinner `.loading-spinner-icon` (`Loading.css`),
  `.notificaciones-bell__push-toggle` (`NotificacionesBell.css`), hover de `.docs-row-sub--link`
  (`Operaciones.css`).
- **Hover de chips de documento:** `.doc-chip:hover`, mezclado con el tinte (`Rrhh.css`,
  `Operaciones.css`).
- **Gráfico del Dashboard:** la serie de CorevexSAC lee `--copper` (`hooks/useComparativoChart.js`).

**`--copper-dark` (37 usos):** hover de `.btn-primary` y `.btn-seguir-conectado`, enlaces
(`.link-button`), pestañas activas (`.tabs button.active` en RRHH, Operaciones y Finanzas),
hover de enlaces de documentos (`.docs-row-title--link`, `.vehiculo-doc-nombre--link`,
`.fin-card-archivo--link`), texto de las opciones elegidas y de los chips (`.doc-chip`,
`.tipo-chip`, `.fin-tag-tipo--factura`), íconos del Dashboard (`.kpi-icon.copper`, `.row-icon`),
insignia `.co-badge.corevex`, `.rol-superadmin`, `.usuario-avatar` y el botón de borde «primario».

**`--copper-tint` (32 usos):** fondo de pestañas activas, opciones elegidas, chips de
documento, `.co-badge.corevex`, `.usuario-avatar`, `.rol-superadmin`, `.kpi-icon.copper`,
hover de menús y listas de selección.

**Ojo con las pestañas:** usan `--copper-tint` y `--copper-dark`, no `--copper`. En C siguen
el mismo cambio porque toda la familia pasa a navy.

## A tener en cuenta antes de aplicar C

- **`--ink` también pinta el panel del Login** (`AuthShell.jsx`, `bg-ink`) **y los avisos
  emergentes** (`ToastContainer.css`). Los tres pasarían al navy.
- **La barra superior del celular (`theme-color`) y el manifest** tienen `#243447` escrito
  a mano (`index.html`, `public/manifest.webmanifest`). No se tocaron; si aplicas C,
  conviene cambiarlos a `#081c49` para que coincidan.
- **Enlaces frente al texto:** el enlace (`#0c255f`) y el texto normal (`#011025`) quedan
  casi igual de oscuros (1.31:1). `.link-button` está subrayado y los enlaces de
  documentos tienen subrayado punteado, así que se siguen reconociendo. Pero su hover, que
  hoy cambia a `--copper-dark`, casi no se notaría.
