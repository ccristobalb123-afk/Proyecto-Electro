# Tailwind CSS en Activo360

Tailwind 4 (`tailwindcss` y `@tailwindcss/vite`, versión fija 4.3.4) está
instalado para migrar **pantalla por pantalla**. Hoy ninguna pantalla lo usa:
todo se ve igual que antes.

- Entrada: `src/styles/tailwind.css` (importada en `src/main.jsx`).
- Plugin: `tailwindcss()` en `vite.config.js`.
- Valores: los de `src/styles/tokens.css`. Tailwind los **lee** con `var()`;
  para cambiar un color o un espaciado se cambia **solo** `tokens.css`.

## Cómo se usa

Se escriben clases en el `className` del JSX:

```jsx
<div className="bg-card border-2 border-control rounded-lg p-4 md:p-6">
  <h3 className="font-display text-lg font-semibold text-text">Título</h3>
  <p className="text-sm text-muted">Detalle</p>
</div>
```

Tailwind busca clases en `src/` al compilar y genera solo las que encuentra.
Escribe los nombres completos: `` `bg-${color}` `` **no** funciona (Tailwind
no ve la clase armada en tiempo de ejecución); usa
`ok ? "bg-success-tint" : "bg-danger-tint"`.

## Token → clase

| Token (`tokens.css`) | Clase de Tailwind |
|---|---|
| `--border-control` | `border-control` (también `border-border-control`) |
| `--borde-tarjeta-color` | `border-tarjeta` (tarjetas de equipo y vehículo, 2px) |
| `--borde-tarjeta-suave` | `border-tarjeta-suave` (demás tarjetas y paneles, 1px) |
| `--borde-tarjeta-ancho` | `border-(length:--borde-tarjeta-ancho)` (o `border-2`) |
| `--border` | `border-border`, `divide-border` |
| `--paper`, `--card` | `bg-paper`, `bg-card` |
| `--fondo-pagina` | `bg-fondo-pagina` (fondo de la zona de contenido, detrás de las tarjetas) |
| `--text`, `--muted`, `--muted-2` | `text-text`, `text-muted`, `text-muted-2` |
| `--copper`, `--copper-dark`, `--copper-tint` | `bg-copper`, `text-copper-dark`, `bg-copper-tint`… |
| `--electro*`, `--volt*`, `--danger*`, `--success*` | igual: `bg-danger-tint`, `text-success-dark`… |
| `--ink`, `--ink-2`, `--on-ink*`, `--on-accent` | `bg-ink`, `text-on-ink-muted`, `text-on-accent`… |
| `--gray-tint`, `--gray-dark` | `bg-gray-tint`, `text-gray-dark` |
| `--link`, `--link-hover` | `text-link`, `hover:text-link-hover` (enlaces) |
| `--nav-activo` | `bg-nav-activo` (elemento activo del menú, avatar) |
| `--font-display`, `--font-body`, `--font-mono` | `font-display`, `font-body`, `font-mono` |
| `--fs-xs` … `--fs-2xl` | `text-xs`, `text-sm`, `text-base`, `text-md`, `text-lg`, `text-xl`, `text-2xl` |
| `--fw-regular` … `--fw-bold` | `font-regular`, `font-medium`, `font-semibold`, `font-bold` |
| `--space-N` (N × 4 px) | `p-N`, `m-N`, `gap-N`, `px-N`, `mt-N`… (ej. `--space-4` → `p-4`) |
| `--radius`, `--radius-lg` | `rounded`, `rounded-lg` |
| `--shadow-sm`, `--shadow-md`, `--shadow-lg` | `shadow-sm`, `shadow-md`, `shadow-lg` |
| `--ease-out` | `ease-out` |

Cualquier color sirve en `bg-`, `text-`, `border-`, `outline-`, `fill-`… y
admite opacidad: `bg-copper/10`.

Para espaciados usa los números que existen en `tokens.css`: **1, 2, 3, 4, 5,
6, 8, 10, 12**. Otros (`p-7`) funcionan pero se salen del sistema.

**No existen** los colores de Tailwind (`bg-blue-600`, `text-gray-500`) ni sus
tamaños, radios o sombras por defecto: se quitaron a propósito para que solo
haya valores de la app. Si falta un valor, se agrega primero a `tokens.css` y
luego a `tailwind.css`.

Para algo puntual sin token: `w-[290px]`, o un token sin clase:
`p-(--space-4)`, `text-(length:--fs-control-tactil)`.

## Breakpoints

Iguales a `responsive.css`. Ojo con la dirección: `responsive.css` dice
"**hasta** X px" (`max-width`); Tailwind, "**desde**".

| `responsive.css` | Desde (Tailwind) | Hasta (Tailwind) |
|---|---|---|
| `(max-width: 560px)` formularios de modales | `sm:` = desde 561 px | `max-sm:` = hasta 560 px |
| `(max-width: 640px)` celular | `md:` = desde 641 px | `max-md:` = hasta 640 px |
| `(max-width: 960px)` tablet | `lg:` = desde 961 px | `max-lg:` = hasta 960 px |

Ejemplo: `max-md:hidden` se oculta justo en los mismos anchos donde se aplica
`@media (max-width: 640px)`. No hay `xl:` ni `2xl:`.

Otros anchos que se usan solo en algún módulo (800 px en las tablas de RRHH,
576/992/1200 en las grillas): `max-[801px]:` (hasta 800 px),
`min-[992px]:` (desde 992 px).

`pointer: coarse` (pantallas táctiles, 44 px) **no** es un breakpoint: esas
reglas siguen en `responsive.css`.

## Convivencia con el CSS actual

1. **Sin preflight.** No se carga el "reinicio" de Tailwind. Los elementos
   siguen con los estilos del navegador + `base.css`. Consecuencia: `border`
   no pone color (usa el del texto); escribe siempre `border border-control`.
2. **El CSS actual siempre gana.** Tailwind vive en capas de cascada
   (`@layer theme` y `@layer utilities`); el CSS de la app no está en ninguna
   capa, y lo que no está en capa le gana a lo que sí, sin importar la
   especificidad ni el orden de carga. Si un elemento tiene
   `.equipo-card { padding: 16px }` y le agregas `p-2`, **sigue con 16 px**.
3. **Cómo migrar una regla:** pasa la propiedad a clases de Tailwind y
   **bórrala** del CSS antiguo en el mismo cambio. Si dejas las dos, gana la
   antigua (y la clase nueva parece "no funcionar").
4. **No uses `!`** (`p-2!`, el `!important` de Tailwind) para ganarle al CSS
   antiguo: rompe la regla 2 y después nadie sabe qué manda.
5. **No toques** las reglas globales de campos, combos, botones ni los 44 px
   táctiles (`responsive.css`, `filters.css`, `buttons.css`): siguen igual y
   le ganan a cualquier clase.
6. **Nombres que ya existen:** `.sr-only` y `.font-display` son de la app
   (en `tokens.css`). Tailwind no genera `sr-only` (está excluida en
   `tailwind.css`) y su `font-display` da el mismo valor.
7. **Palabras sueltas en el código:** Tailwind toma como clase cualquier
   palabra que coincida (ej. `hidden` en `<input hidden>`). No pasa nada:
   la regla solo se aplica a elementos con esa clase. Si alguna genera CSS
   inútil, se excluye en `@source not inline(...)` de `tailwind.css`.
8. **CSP:** todo queda en el archivo `.css` del build (`style-src 'self'`),
   sin estilos en línea. No hay que tocar la política.
9. **Etiquetas con estilo de `base.css`:** `base.css` tampoco está en capa,
   así que en estos elementos esas propiedades **no** se pueden pasar a
   clases (se quedan en el `.css` del módulo):

   | Elemento | Propiedades que fija `base.css` |
   |---|---|
   | `h1`…`h6` | `font-size`, `font-weight`, `line-height`, `margin-top`, `margin-bottom` |
   | `p` | `margin-top`, `margin-bottom` |
   | `label` | `display` |
   | `button`, `input`, `select`, `textarea` | `margin`, `font-family`, `font-size`, `line-height` |
   | `button` | `border-radius`, `text-transform` |

   Lo mismo con un botón global (`.btn-primary`) o un enlace (`a` ya trae
   `color` y `text-decoration`). Ejemplo: Login (`AuthForm.css`).

## Detalles que cambian el estilo calculado

Para que una migración quede idéntica (no solo "parecida"):

- `scale-y-0`, `rotate-45`… usan las propiedades `scale`/`rotate`, no
  `transform`. Si antes había `transform:`, usa `[transform:scaleY(0)]`.
- `transition-colors`, `duration-…` arman otra lista de propiedades: para
  copiar una transición exacta, `[transition:color_180ms_var(--ease-out)]`.
- `rounded-full` no es `50%`: usa `rounded-[50%]` si antes era 50%.
- `flex-1` es `1 1 0%`; `flex: 1 1 0` es `[flex:1_1_0]`.
- `border-none` no reinicia el color del borde como `border: none`; si
  hace falta exacto, `[border:none]` (igual `[background:none]`).
- Respaldo `100vh` → `100dvh`: `min-h-screen supports-[min-height:100dvh]:min-h-dvh`
  (con las dos clases sueltas, gana la que Tailwind ordena último).
- Anchos que no son breakpoint del tema (ej. 960 en el acceso):
  `max-[960px]:` = hasta 959 px.
- Las clases armadas con `${…}` no existen para Tailwind: guarda la clase
  entera en una constante (ej. `components/auth/clasesAuth.js`).

## Antes de dar por migrada una pantalla

- Capturas a 360 y 1280 px, antes y después, en cada estado, y el estilo
  calculado de cada elemento.
- `npm run lint` sin subir de 12 avisos.
- Borrar del `.css` del módulo lo que pasó a clases (y el archivo, si queda
  vacío).
