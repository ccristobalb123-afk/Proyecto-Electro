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
2. **El CSS sin capa gana; las capas `base` y `components` no.** El orden de
   las capas, de menor a mayor prioridad, es `theme → base → components →
   utilities → CSS sin capa`.
   - En la capa `components` van, en este orden, `buttons.css` (con
     `.btn-primary` primero, que antes estaba en `tokens.css`), `badges.css`
     y `filters.css` (los importa `tailwind.css` con `layer(components)`,
     en el mismo orden relativo que tenían sin capa). Las clases de Tailwind
     y el CSS sin capa les ganan; entre ellas mandan la especificidad y el
     orden de siempre.
   - En la capa `base` van, en este orden, `base.css` y `etiquetas.css` (los
     importa `tailwind.css` con `layer(base)`): **cualquier clase de Tailwind
     les gana**. Un `<h2>` o un `<p>` aceptan clases de tamaño, peso y margen
     sin dejar nada en CSS, y un `<button>` o un `<a>` aceptan clases de
     letra, cursor, color o subrayado.
   - `etiquetas.css` tiene las reglas de etiqueta globales que antes estaban
     en `tokens.css`: `*` (`box-sizing`), `html, body, #root` (alto),
     `body` (margen, letra, fondo, color), `button` (letra del body,
     cursor) y `a` (color heredado, sin subrayado). Va **después** de
     `base.css` a propósito: `base.css` pone `button { font-family:
     inherit }` y la regla de `etiquetas.css`, con la misma especificidad,
     la reemplaza por la letra del body. No cambies ese orden.
   - Consecuencia: una regla sin capa con especificidad 0 (`:where(...)`)
     le gana a esas etiquetas. Pasó con el botón de `VisorArchivo` (ver
     regla 10).
   - El resto del CSS de la app (variables y clases de `tokens.css`,
     `foco.css`, `responsive.css`, el `.css` de cada módulo) no está en capa, y lo que
     no está en capa le gana a lo que sí, sin importar la especificidad ni
     el orden de carga. Si un elemento
     tiene `.equipo-card { padding: 16px }` y le agregas `p-2`, **sigue con
     16 px**.
   - **Ojo con `!important`:** en capas se invierte. Las dos reglas con
     `!important` de `base.css` (`[hidden] { display: none }` y el foco de
     `[tabindex="-1"]`) ahora le ganan a **cualquier** `!important` sin capa.
     Hoy ninguna regla compite con ellas; no escribas otro `display` u
     `outline` con `!important` para esos casos.
   - La regla global de foco (`input:focus-visible, button:focus-visible`,
     en `styles/foco.css`) queda a propósito fuera de capa: es la red de
     seguridad del anillo de foco y ninguna clase debe poder quitarlo. Las
     excepciones que sí lo cambian tienen que estar sin capa también y viven
     en el mismo archivo, después de la regla y con más especificidad
     (0-1-1 o más): el `outline: none` del campo del buscador global y del
     de las barras de filtros (el foco se dibuja en la caja), el anillo rojo
     del campo «escribe ELIMINAR» de ConfirmDialog y el anillo por dentro
     del borde de la fila de las fichas desplegables. Para cambiar el foco
     de otro control, agrega ahí la excepción con su motivo.
     **Pendiente:** `.btn-seguir-conectado:focus-visible`
     (`AvisoInactividad.css`) es una excepción de foco que todavía no vive en
     `foco.css`; se moverá ahí cuando se migre AvisoInactividad (paso 4).
3. **Cómo migrar una regla:** pasa la propiedad a clases de Tailwind y
   **bórrala** del CSS antiguo en el mismo cambio. Si dejas las dos, gana la
   antigua (y la clase nueva parece "no funcionar").
4. **No uses `!`** (`p-2!`, el `!important` de Tailwind) para ganarle al CSS
   antiguo: rompe la regla 2 y después nadie sabe qué manda.
5. **No toques** las reglas globales de los 44 px táctiles y del
   movimiento reducido (`responsive.css`, `motion.css`), ni las de borde de
   tarjeta (`tarjetas.css`): siguen sin capa y le ganan a cualquier clase.
   Los botones, badges y la barra de filtros (`buttons.css`, `badges.css`,
   `filters.css`) están en la capa `components`: una clase de Tailwind en el
   mismo elemento les gana.
6. **Nombres que ya existen:** `.sr-only` es de la app (en `tokens.css`, sin
   capa) y Tailwind no genera la suya (está excluida en `tailwind.css`): la
   de Tailwind agrega `clip-path` y no es igual. `font-display` y
   `font-mono` son las utilidades de Tailwind (dan `var(--font-display)` y
   `var(--font-mono)`); las copias sin capa que había en `tokens.css` se
   borraron.
7. **Palabras sueltas en el código:** Tailwind toma como clase cualquier
   palabra que coincida (ej. `hidden` en `<input hidden>`). No pasa nada:
   la regla solo se aplica a elementos con esa clase. Si alguna genera CSS
   inútil, se excluye en `@source not inline(...)` de `tailwind.css`.
8. **CSP:** todo queda en el archivo `.css` del build (`style-src 'self'`),
   sin estilos en línea. No hay que tocar la política.
9. **Reglas sin capa que bloquean clases:** si un elemento lleva una clase o
   etiqueta que una regla sin capa ya estiliza, esas propiedades **no** se
   pueden pasar a clases (se quedan en el `.css` del módulo). Hoy:

   | Regla sin capa | Propiedades que fija |
   |---|---|
   | `input:focus-visible`, `button:focus-visible` y sus excepciones (`foco.css`) | contorno de foco (`outline`): a propósito, para que ninguna clase lo quite |
   | `responsive.css` (táctil, celular), `motion.css`, `tarjetas.css` | lo que fija cada regla (ej. `html .link-button` en táctil: relleno y margen vertical) |
   | `.sr-only` (`tokens.css`) | posición, tamaño y recorte del texto solo para lectores de pantalla |

   `.btn-primary`, `.btn-outline-sm`, `.btn-danger`, `.icon-btn`,
   `.link-button` (`buttons.css`), `.co-badge` (`badges.css`) y la barra de
   filtros (`filters.css`) ya **no** están en esta lista: van en la capa
   `components`, así que una clase les gana. Los residuos que habían quedado
   por ellas siguen en su `.css` y se pasan a clases en un paso aparte (ver
   «Estado de la migración»).

   `base.css` y las etiquetas `button`/`a` ya **no** están en esta lista:
   desde que van en la capa `base`, sus propiedades (márgenes y tamaños de
   `h1`-`h6` y `p`, `display` de `label`, letra y margen de
   `button`/`input`/`select`/`textarea`, radio y cursor de `button`, color
   y subrayado de `a`) se pueden pasar a clases. Los restos que habían
   quedado por `base.css` en los archivos ya migrados ya pasaron a clases
   (ver «Estado de la migración»).
10. **Reglas sin capa con especificidad 0 (`:where(...)`).** Antes perdían
    contra las etiquetas de `tokens.css`; desde que esas etiquetas están en
    capa, les ganan. Ya no queda ninguna: la única,
    `:where(button.boton-ver-archivo) { font: inherit; … }` (`VisorArchivo.css`),
    pasó a clases en `BotonVerArchivo` (`BOTON_VER`, con `[font:inherit]`),
    que también le ganan a las etiquetas y pierden contra la clase de cada
    pantalla, igual que la regla. El botón hereda la letra del contenedor. Se midió en todas las pantallas,
    modales y estados donde aparece (chips de RRHH, documentos de vehículos,
    tarjetas de Finanzas): el contenedor siempre tiene la letra del body
    (Inter), así que no cambia nada. Si alguna vez se pone ese botón dentro
    de un texto con `font-display` o `font-mono`, tomará esa letra.
    El único botón medido dentro de un texto con otra letra (el «Cerrar» de
    la campana, dentro del título en Space Grotesk) sigue con Inter por el
    orden de `etiquetas.css` (regla 2).

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
- Celular en horizontal (poca altura y más de 640 px de ancho, la barra
  fija del modal): `apaisado:` = `@media (max-height: 500px) and
  (min-width: 641px)` (variante propia, en `tailwind.css`).
- Anchos que no son breakpoint del tema (ej. 960 en el acceso):
  `max-[960px]:` = hasta 959 px.
- Las clases armadas con `${…}` no existen para Tailwind: guarda la clase
  entera en una constante (ej. `components/auth/clasesAuth.js`).
- **Especificidad.** Una clase de Tailwind vale (0-1-0). Si la regla de antes
  estilizaba a los hijos (`.form-field label`, 0-1-1), escríbela en el
  contenedor con el mismo selector: `[&_label]:block` también vale (0-1-1) y
  sigue ganándole a las clases propias de cada etiqueta, igual que antes.
  Variantes útiles: `[&_input:not([type=radio]):not([type=checkbox])]:…`
  (0-3-1), `[fieldset&]:…` (solo si el elemento es un `<fieldset>`),
  `[&>:is(button,a)]:…` (hijos directos).
- **`backdrop-filter`:** el build (lightningcss) juntaba `backdrop-filter` y
  `-webkit-backdrop-filter` de una misma regla y dejaba solo el que tiene
  prefijo, así que el desenfoque del fondo de ConfirmDialog (y del aviso de
  inactividad) solo se ve en Safari. Al migrar se copió así
  (`[-webkit-backdrop-filter:blur(4px)]`) para no cambiar el aspecto;
  agregar `[backdrop-filter:blur(4px)]` lo activaría también en Firefox y
  Chrome.
- **`font-mono` y `font-display`** son utilidades de Tailwind como las demás
  (hasta el paso 3 del cierre también existían sin capa en `tokens.css` y le
  ganaban a cualquier otra regla de letra; por eso hay código con
  `[font-family:var(--font-mono)]`, que hoy da lo mismo).
- **Ganarle al contenedor sin `!`.** Si un hijo tiene que ganarle a esa regla
  del contenedor (antes lo hacía por estar después en el CSS), sube su
  especificidad con `[&&]:` (repite la clase: `.x.x`, 0-2-0). Ej. la etiqueta
  de una opción dentro de un campo: `[&&]:flex` le gana a `[&_label]:block`.
  Con dos reglas iguales de contenedor no hay que adivinar el orden: Tailwind
  las ordena por propiedad y nombre, no por cómo están escritas.

## Antes de dar por migrada una pantalla

- Capturas a 360 y 1280 px, antes y después, en cada estado, y el estilo
  calculado de cada elemento.
- `npm run lint` sin subir de 12 avisos.
- Borrar del `.css` del módulo lo que pasó a clases (y el archivo, si queda
  vacío).
- Comparar también hover, pressed y foco de lo interactivo, forzándolos de
  verdad: con WebDriver, acción `pointerMove` (hover), `pointerMove` +
  `pointerDown` sin soltar (pressed) y `focus({focusVisible: true})` (foco
  de teclado). Comprobar en el navegador que `:hover`, `:active` y
  `:focus-visible` quedan activos.
- Hacer la primera captura de cada tamaño con una sesión de "calentamiento"
  descartada: la primera sesión del navegador dibuja algunas letras con
  0.2 px de diferencia y parece un cambio que no lo es.

## Estado de la migración

**Capa base:** hecha. En `@layer base` (desde `tailwind.css`) están
`base.css` y `etiquetas.css` (las reglas de etiqueta `*`, `html/body/#root`,
`body`, `button` y `a`, que antes estaban en `tokens.css`).

**Capa components:** hecha. En `@layer components` (desde `tailwind.css`, en
este orden) están `buttons.css` (con `.btn-primary`, que salió de
`tokens.css`), `badges.css` y `filters.css`. Se midió que nada cambia en
todas las pantallas. Dos ajustes en el mismo cambio, porque en capa el
resultado habría cambiado:
- el `outline: none` del campo del buscador de las barras de filtros pasó a
  `styles/foco.css`, sin capa (en capa perdía contra la regla global de foco
  y se veían dos anillos);
- «Tomar foto» / «Elegir archivo» de Nuevo gasto llevan `[&&]:inline-flex`
  (la etiqueta general del campo, `[&_label]:block`, ahora le gana a
  `.btn-outline-sm`).

**Restos de `tokens.css` y foco:** hechos (paso 3 del cierre). La regla
global de foco salió de `tokens.css` y está en `styles/foco.css` junto con
todas sus excepciones (los dos buscadores, el campo «escribe ELIMINAR» y la
fila de las fichas), que antes estaban en `GlobalSearch.css`,
`ConfirmDialog.css` y `fichas.css` (eliminados). `.font-display` y
`.font-mono` se borraron de `tokens.css`: las utilidades de Tailwind dan la
misma letra en cada uso (medido). `.pantalla-cargando-sesion` pasó a clases
(`PANTALLA_CARGANDO` en `components/shared/clasesCarga.js`). `.sr-only` se
queda en `tokens.css` (ver la tabla). `tokens.css` queda con las variables y
`.sr-only`.

**Qué queda sin capa y por qué:**

| Archivo | Qué | Por qué |
|---|---|---|
| `tokens.css` | variables (`:root`) | son la fuente de valores, no reglas |
| `foco.css` | regla de foco (`input/button:focus-visible`) | red de seguridad del foco de teclado: ninguna clase debe poder quitarlo |
| `foco.css` | excepciones a la regla de foco (dos buscadores, campo «escribe ELIMINAR», fila de las fichas) | para cambiar el foco hay que estar sin capa, como la regla, y con más especificidad |
| `tokens.css` | `.sr-only` | se deja con su definición, sin capa: la de Tailwind agrega `clip-path` y no es igual (por eso está excluida en `tailwind.css`) |
| `responsive.css`, `motion.css`, `tarjetas.css` | ajustes de celular/táctil, movimiento reducido y borde de tarjeta | ajustes que ganan siempre, a propósito |
| `.css` de cada módulo | lo anotado en cada fila de «Migrado» | bloqueado por las reglas de arriba, `@keyframes` o selectores que una clase no puede expresar |

**Residuos de la capa `components`:** migrados. Lo que `.btn-primary`,
`.btn-outline-sm`, `.btn-danger` y `.link-button` bloqueaban cuando estaban
sin capa pasó a clases: el botón del topbar (`AppShell.css`, eliminado), el
botón principal del acceso (`AuthForm.css`), el aspecto de `BotonCarga`
(`Carga.css`), los botones de la ficha de RRHH (`fichas.css`), «Tipos de
equipo» y los botones de los avisos de Equipos (`EquiposCards.css`), los
botones del documento de Nuevo gasto (`Finanzas.css`, eliminado), los botones
de las fotos del equipo y «Mantener la actual» (`Modal.css`) y «Ver todos»
(`Dashboard.css`, eliminado). Se quedan en CSS, a propósito:
- el `margin-top: 0` de «Completar datos» y «Renovar fechas»
  (`EquiposCards.css`): hoy le gana por especificidad a la regla táctil de
  `responsive.css` (`html .link-button`, margen vertical de −12 px); como
  clase perdería contra ella y en pantallas táctiles el botón subiría 12 px;
- el cursor de mano de «Tomar foto» / «Elegir archivo» de las fotos del
  equipo mientras se guarda (`Modal.css`): le gana por orden a la regla del
  cursor «trabajando», también sin capa; como clase perdería.

**Restos de `base.css`:** migrados. Lo que `base.css` (y después
`etiquetas.css`) bloqueaba cuando estaba sin capa pasó a clases en el mismo
cambio en que se borró del CSS viejo:

- `AuthShell.css`: tamaños, márgenes y letra del `h1` y el `p` del panel
  (`AuthShell.jsx`).
- `AuthForm.css`: `h2`, subtítulo y `p` de error/aviso, `label`, letra de
  `input` y de las casillas OTP, y el enlace «Volver» (margen, letra, color y
  hover; `VOLVER` y `VOLVER_ABAJO` en `clasesAuth.js`).
- `PasswordField.css`: eliminado (`display` y letra del label, letra del
  input y radio del ojo, ahora en `PasswordField.jsx`).
- `EstadoVacio.css` y `EstadoError.css`: eliminados (márgenes de los `<p>` y
  del botón).
- `Dashboard.css`: tamaño y peso de los `<h2>` (`PANEL_TITULO`) y letra del
  `<select>` de mes.

Las clases que siguen siendo gancho de otra regla se dejaron:
`auth-form` (`AuthForm.css` y `motion.css`), `password-field` (`AuthForm.css`)
y `month-select` (alto táctil de 44 px en `responsive.css`).

**Migrado** (estilos en clases; en su `.css` queda solo lo que bloquea una
regla sin capa, regla 9, o lo que una clase no puede expresar):

| Qué | Archivos | CSS que queda y motivo |
|---|---|---|
| Login y Restablecer contraseña | `AuthShell.jsx`, `AuthRail.jsx`, `OtpInput.jsx`, `clasesAuth.js`, `Login.jsx`, `RestablecerPassword.jsx` | `AuthShell.css`: solo los `@keyframes` de entrada. `AuthForm.css`: el margen de 18 px del campo de contraseña dentro del formulario (`.auth-form .password-field`: ajuste de contexto sobre un componente compartido que fuera del acceso usa `mb-4`) y el `@keyframes` del error. El botón principal (ancho, alto, letra, centrado, transición y escala al presionar) va con clases en el formulario (`FORM` en `clasesAuth.js`, `[&_.btn-primary]:…`). Ganchos: `auth-form` y `btn-primary` (`motion.css`: sin escala con movimiento reducido) |
| Campo de contraseña | `PasswordField.jsx` | ninguno (`PasswordField.css` se eliminó) |
| Medidor de fuerza | `PasswordStrength.jsx` | ninguno (`PasswordStrength.css` se eliminó) |
| Estado vacío | `EstadoVacio.jsx` | ninguno (`EstadoVacio.css` se eliminó) |
| Estado de error | `EstadoError.jsx` | ninguno (`EstadoError.css` se eliminó) |
| Estructura (menú lateral, topbar, contenido) | `AppShell.jsx` | ninguno (`AppShell.css` se eliminó). El botón de acción de cada pantalla en el topbar va con clases en su contenedor (`TOPBAR_ACCION`, `[&_.btn-primary]:…`, y en ≤400 px solo el «+»). Clases que quedan como gancho: `sidebar` (`motion.css`), `sidebar-cerrar`, `hamburger-btn`, `logout-btn`, `nav` (`responsive.css`), `main` (`responsive.css`, `tarjetas.css`) y `topbar-accion-texto` (el texto de ese botón, en las pantallas; `TOPBAR_ACCION` lo oculta en ≤400 px) |
| Buscador global | `GlobalSearch.jsx` | ninguno (`GlobalSearch.css` se eliminó): el `outline: none` del campo está en `foco.css` con las demás excepciones de foco. Ganchos: `search` y `global-search` (`responsive.css`). Las reglas de `.search` que compartían las barras de filtros pasaron, iguales, a `filters.css` como `.filters .search` |
| Campana de notificaciones | `NotificacionesBell.jsx`, `EtiquetaUrgencia.jsx` | `NotificacionesBell.css`: solo el `@keyframes` del panel. `EtiquetaUrgencia.css` se eliminó. Ganchos: `notificaciones-bell__boton`, `__cerrar`, `__push-toggle` (`responsive.css`) y `__panel` (`motion.css`) |
| Avisos (toasts) | `ToastContainer.jsx` | `ToastContainer.css`: los `@keyframes` de entrada y la regla que oculta o deja pasar los toques de los avisos con un modal abierto (`body:has(...)`: depende del estado de otro componente). Ganchos: `toast`, `toast--{tipo}` (`ToastContainer.css`, `motion.css`) y `toast__cerrar` (`responsive.css`) |
| Dashboard | `Dashboard.jsx` (+ `className` en `EtiquetaUrgencia.jsx`) | ninguno (`Dashboard.css` se eliminó). «Ver todos» lleva `mt-0 text-sm`; en pantallas táctiles manda, como antes, el margen de la regla táctil de `responsive.css`. El relleno de la carga del gráfico va en clases (`<Loading compacto>`) |
| Modal compartido (contenedor, fondo, encabezado, pie, línea de tiempo y variante «seguridad» con su hoja inferior en celular) | `Modal.jsx`, `clasesModal.js` | `Modal.css`: los `@keyframes` de la variante «seguridad»; el cursor de «trabajando» sobre los campos mientras se guarda (`.modal-cuerpo:disabled :is(input, select, textarea, label)`: etiquetas de las pantallas fijan `cursor: pointer` en reglas sin capa), y lo bloqueado en los campos (fila siguiente) |
| Campos de formulario de los modales | `clasesModal.js` (`CAMPO`, `FILA`, `ERROR_CAMPO`, `AYUDA`, `AVISO…`, `DROPZONE…`, `OPCION…`, `BOTON_SECUNDARIO`…), usadas en `Modal.jsx` (empresa, aviso de vencimiento, IGV, detracción) y en cada formulario (`ModalNuevo*`, `ModalEditar*`, `ModalInspeccion`, `ModalTiposEquipo`, `FotosEquipo`, `CamposEquipo`, `CamposDocumentosVehiculo`, `ModalDocumentos`, `Administracion.jsx`…) | `Modal.css`: solo el cursor de mano de «Tomar foto» / «Elegir archivo» de las fotos del equipo mientras se guarda (`.foto-equipo__botones label.btn-outline-sm`: le gana por venir después a la regla del cursor «trabajando», las dos sin capa; como clase perdería). Lo demás de esos botones, de «Mantener la actual» y la letra de los botones de archivo de Nuevo gasto va en clases (`FotosEquipo.jsx`, `ModalNuevoGasto.jsx`); como la etiqueta general del campo (`[&_label]`, 0-1-1) le gana a una clase sola, el display y la letra van con `[&&]:`. Ganchos: `form-field` (`responsive.css`, `Administracion.css`), `form-row` (`responsive.css`), `campo-ayuda` (`Operaciones.css`), `co-choice`, `igv-choice` (`responsive.css`), `aviso-input-row`, `btn-secondary` (`responsive.css`), `dropzone`, `foto-equipo__botones` (el cursor de arriba), `foto-equipo-slot` (campos atenuados mientras se guarda) |
| Botón con carga y spinner | `Carga.jsx` | `Carga.css`: solo el `@keyframes` del giro. Display, alineación, separación y el aspecto «ocupado» (`:disabled` sin atenuar, cursor de «trabajando») van en clases (`BOTON_CARGA`) |
| Bloque de carga | `Loading.jsx` | `Loading.css`: solo el `@keyframes` del pulso del texto |
| Diálogo de confirmación | `ConfirmDialog.jsx` | ninguno (`ConfirmDialog.css` se eliminó): el anillo de foco rojo del campo «escribe ELIMINAR» está en `foco.css` (`.confirm-palabra input:focus-visible`). Ganchos: `confirm-overlay` (`ToastContainer.css`), `btn-confirm-primary`, `-secondary`, `-danger` (`responsive.css`) y `confirm-palabra` (`foco.css`). El fondo lleva solo `-webkit-backdrop-filter` (ver «Detalles») |
| Visor de archivos | `VisorArchivo.jsx`, variante «visor» de `Modal.jsx` (`FONDO_VISOR`, `CAJA_VISOR`, `TITULO_VISOR`), `ACCIONES_VISOR` en `clasesModal.js` | `VisorArchivo.css`: solo los `@keyframes` de entrada del fondo y del visor. El botón «Ver archivo» (`BotonVerArchivo`) ya no usa la regla `:where(...)` (regla 10) |
| Foto ampliada | `Lightbox.jsx` | ninguno (`Lightbox.css` se eliminó). Gancho: `lightbox-close` (`responsive.css`) |
| Sesiones y dispositivos | `SesionesModal.jsx` | ninguno (`SesionesModal.css` se eliminó) |
| Administración (lista de usuarios, tarjetas, formulario de usuario y contraseña generada) | `Administracion.jsx`, `ModalPasswordGenerada.jsx` (base de la tarjeta en `clasesTarjeta.js`, compartida con Finanzas) | `Administracion.css`: solo el cursor de mano de la casilla SuperAdmin mientras se guarda (`.form-field label.superadmin-toggle`: le gana a la regla del cursor «trabajando» de `Modal.css`, sin capa y con la misma especificidad, por venir después; una clase perdería). Se borraron reglas sin uso (`.rol-choice`, `.rol-generico`, `.rol-hint`). Ganchos: `usuarios-grid`, `usuario-card-footer`, `usuario-tu-tag`, `modulos-check`, `empresas-check` (`responsive.css`), `usuario-card` (`tarjetas.css`: el borde suave sigue ahí) y `superadmin-toggle`. El texto del botón «Nuevo usuario» (`.topbar-accion-texto`) sigue en `AppShell.css`: lo comparten las demás pantallas |
| Finanzas (pestañas, tarjetas de facturas, facturas por pagar y gastos, y lo propio de sus modales: pagos registrados, categorías de gasto, documento y «Faltan datos» de Nuevo gasto, detalle de «¿Eliminar este gasto?») | `Finanzas.jsx`, `clasesFinanzas.js`, `FacturasGrid.jsx`, `FacturasPorPagarGrid.jsx`, `GastosGrid.jsx`, `CampoComprobante.jsx`, `ModalRegistrarPago.jsx`, `ModalCategoriasGasto.jsx`, `ModalNuevoGasto.jsx`, `DetalleEliminarGasto.jsx`; compartidas nuevas: `clasesTarjeta.js` (tarjeta, encabezado, rótulo, pie y grilla) y `clasesPestanas.js` (pestañas); `OPCIONES_FILA` en `clasesModal.js` | ninguno (`Finanzas.css` se eliminó): los botones del documento de Nuevo gasto van en clases (`BOTON_ARCHIVO`, `BOTON_CAMARA`; «Tomar foto» con `pointer-coarse:`). Ganchos: `tabs` (`responsive.css`), `fin-grid`, `fin-card-header`, `fin-card-footer`, `fin-card-archivo`, `fin-card-archivo--link` (`responsive.css`), `fin-card` (`tarjetas.css`: el borde suave sigue ahí), `modal-cuerpo` (documento atenuado mientras se guarda). «Ver comprobante» sube la letra y el color con `[&&]:` para ganarle a las clases de `BotonVerArchivo` |
| RRHH (pestañas, tabla y tarjetas de Contratos, fichas de Cursos / EMO en lo que solo usa RRHH, detalle, selector de personal y avisos del formulario de curso) | `Rrhh.jsx`, `clasesRrhh.js`, `TablaRrhh.jsx`, `CursosPorPersona.jsx`, `SelectorPersonal.jsx`, `ModalNuevoCurso.jsx`; reutiliza `clasesTarjeta.js` (tarjeta de celular y rótulos) y `clasesPestanas.js` | `Rrhh.css`: solo la fila de botones del formulario de curso en celular (`.modal-actions:has(> button[value="otro"])`: «Cancelar» lo pone `ModalActions`, que no recibe clases). La ficha y el chip de documento pasaron a constantes compartidas con Operaciones (`clasesFicha.js`, `clasesDocumento.js`; ver la fila de Operaciones, parte 2). Ganchos: `tabs`, `table-scroll`, `rrhh-cards-mobile`, `selector-personal__lista` (`responsive.css`), `rrhh-mobile-card` (`tarjetas.css`). Ya no usan `.mini-avatar` ni `.equipo-card-label`, que `Operaciones.css` y `EquiposCards.css` definen con otros valores (26 px; margen inferior de 2 px) y se colaban en RRHH según el orden en que se abrían las pantallas |
| Operaciones, parte 1: cabecera, pestañas, barra de «Tipos de equipo» y pestaña Equipos (grupos por tipo, tarjetas y el aviso «Faltan datos» del modal de editar equipo) | `Operaciones.jsx`, `EquiposGrid.jsx`, `clasesEquipos.js`, `ModalEditarEquipo.jsx`; reutiliza `clasesPestanas.js` y de `clasesTarjeta.js` el rótulo (`ETIQUETA_FORMA`) y la etiqueta de estado (`ESTADO_BASE`, `ESTADO_PUNTO`, ahora compartidas con RRHH) | `EquiposCards.css`: solo el `margin-top: 0` de «Completar datos» / «Renovar fechas» (ver «Qué queda»). Su letra y color van en clases (`AVISO_FALTAN_BOTON`, `AVISO_VENCIDO_BOTON`) y el borde de «Tipos de equipo» también (`border-control hover:border-electro` en `Operaciones.jsx`: el hover se repite porque la clase le gana al de `.btn-outline-sm`). Se borraron las reglas de tabla y `.code` (Operaciones ya no tiene tablas; solo se colaban en la de RRHH, con los mismos valores) y las que no usaba nada (`.tag`, `.responsable`, `.sin-responsable`, `.row-actions`, `.categorias-lista…`, `.filtros-asignaciones__tipos`, `.equipo-card-actions-spacer`). La regla «Asignado a» con ícono pasó de `Asignacion.css` a clases. Ganchos: `tabs`, `categoria-seccion-header`, `equipo-card-actions`, `equipo-card-fotos-editar`, `equipo-card-select` (`responsive.css`), `equipo-card-foto-btn` (`motion.css`), `equipo-faltantes`, `equipo-vencido` (`EquiposCards.css`). La tarjeta conserva `--borde-tarjeta` (`--borde-tarjeta-ancho`, `--borde-tarjeta-color`) |
| Operaciones, parte 2: Vehículos (tarjetas y estado de cada documento), Asignaciones (fichas por persona y camión), los modales de Operaciones en lo que dependía de `Operaciones.css` y `Asignacion.css` (documentos, asignar y su buscador, hoja de vida, tipos de equipo, inspección, baja, mantenimiento, nota de Nuevo equipo), y dos piezas compartidas | `VehiculosGrid.jsx`, `EstadoDocumento.jsx`, `AsignacionesPanel.jsx`, `ModalDocumentos.jsx`, `CamposDocumentosVehiculo.jsx`, `ModalAsignarEquipo.jsx`, `SelectorDestinatario.jsx`, `ModalHistorialOperaciones.jsx`, `ModalTiposEquipo.jsx`, `ModalInspeccion.jsx`, `ModalBaja.jsx`, `ModalMantenimiento.jsx`, `ModalNuevoEquipo.jsx`; compartidas nuevas: `clasesFicha.js` (la ficha desplegable de Cursos / EMO y Asignaciones, antes `fichas.css`), `clasesDocumento.js` (el chip de documento, antes `.doc-chip` en `Rrhh.css`, `Operaciones.css` y dos reglas de `Modal.css`; lo usan RRHH, `BotonVerArchivo` por defecto y el formulario del vehículo), `AVATAR_FORMA` en `clasesTarjeta.js` (30 px en RRHH, 26 px en Asignaciones), `RECUADRO…` y `AYUDA_TEXTO` en `clasesModal.js` | Se borraron `Operaciones.css`, `Asignacion.css` y `VehiculosCards.css`. El anillo de foco de la fila de la ficha (`.persona-cursos__cabecera:focus-visible`) está en `foco.css` (`fichas.css` se eliminó en el paso 3 del cierre). `EquiposCards.css`: lo anotado en la fila de la parte 1. El chip «Adjuntar» opcional tiene dos variantes porque al pasar el cursor no era igual: cobre claro en Cursos / EMO y mezcla con cobre en el vehículo. Ganchos: `doc-chip`, `vehiculos-grid`, `vehiculo-card-top-actions`, `vehiculo-doc-nombre--link`, `docs-row-sub--link`, `selector-destino__lista` (`responsive.css`), `persona-cursos`, `persona-cursos--abierta` (`tarjetas.css`), `persona-cursos__cabecera` (`foco.css`). Las tarjetas de vehículo conservan `--borde-tarjeta` |

**Sin migrar** (todo su estilo sigue en CSS):

- **Pantallas:** ninguna: todas están migradas (lo que queda en el `.css`
  de cada una está en su fila, con su motivo).
- **Componentes con reglas en CSS que todavía no se migra** (se dejan para
  migrarlos junto con ese CSS):
  - `AvisoInactividad.css`: `responsive.css` (alto táctil de 44 px de
    `.btn-seguir-conectado`) y `motion.css` (pulso con movimiento reducido).
    Además, su anillo de foco (`.btn-seguir-conectado:focus-visible`) es una
    excepción de foco que todavía no vive en `foco.css`; se moverá ahí al
    migrar AvisoInactividad (paso 4).
- **Otros:** `Monto.jsx` / `Monto.css` y `MenuAcciones.jsx` / `MenuAcciones.css` se borraron: no se usaban.
- **Globales** (`styles/`): `buttons.css`, `badges.css` y `filters.css`
  siguen como CSS, pero en la capa `components` (ver arriba).
  `foco.css`, `tarjetas.css`, `motion.css` y `responsive.css` quedan sin
  capa. `tokens.css`, `base.css` y `etiquetas.css` no se migran: son la
  fuente de valores y la base.
