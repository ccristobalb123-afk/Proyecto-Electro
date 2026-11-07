# Convenciones de estilo — Proyecto-Electro

## CSS propio (sin Bootstrap)

El proyecto **no usa Bootstrap ni `react-bootstrap`**. Todo el estilo sale de
`tokens.css` (colores, espaciados, tipografía, sombras), `base.css`, `etiquetas.css`, `buttons.css`,
`badges.css`, `filters.css`, `responsive.css` y el CSS de cada módulo.

### Tailwind y capas
Tailwind 4 está instalado, sin preflight y en capas. Orden, de menor a mayor
prioridad:

1. `base`: `base.css` y después `etiquetas.css` (estilos de etiqueta).
2. `components`: `buttons.css` (con `.btn-primary`), `badges.css` y
   `filters.css`, en ese orden. Las clases de Tailwind les ganan.
3. `utilities`: las clases de Tailwind.
4. Sin capa (siempre gana): las variables y la regla de foco de
   `tokens.css`, las excepciones de foco en `foco.css`, `responsive.css`
   (celular y 44 px táctiles), `motion.css` (movimiento reducido),
   `tarjetas.css` (borde de tarjetas), `fichas.css` y lo que queda en el CSS
   de cada módulo (cada regla dice por qué no es una clase).

Los cuatro archivos sin capa a propósito (`foco.css`, `responsive.css`,
`motion.css`, `tarjetas.css`) son "ajustes que ganan siempre": si una regla
de ahí toca una propiedad, ninguna clase la puede cambiar. Uso, tabla token →
clase, breakpoints, reglas de convivencia y la lista completa de lo que queda
sin capa en `frontend/docs/tailwind.md`.

### `base.css`
Conserva únicamente las reglas del antiguo "reboot" de Bootstrap que la interfaz
daba por hechas: `line-height: 1.5` en el `body`, márgenes y peso de los
encabezados, `vertical-align: middle` en los SVG, formularios que heredan la
fuente, `<legend>`/`<fieldset>` y tablas. No agregar estilos visuales ahí.

Se carga desde `tailwind.css` en la capa `base` de Tailwind (no desde
`main.jsx`): cualquier regla sin capa o clase de Tailwind le gana. Sus dos
reglas con `!important` (`[hidden]` y el foco de `[tabindex="-1"]`) le ganan
a cualquier `!important` sin capa.

### `etiquetas.css`
Las reglas de etiqueta globales de la app que antes estaban en `tokens.css`:
`*` (`box-sizing`), `html, body, #root` (alto), `body` (margen, letra, fondo,
color), `button` (letra del body, cursor) y `a` (color heredado, sin
subrayado). También va en la capa `base`, **después** de `base.css`, para que
la letra de `button` le gane al `font-family: inherit` de `base.css`. La regla
de foco (`input/button:focus-visible`) se queda sin capa en `tokens.css`.

### Grillas de tarjetas
CSS Grid con `minmax(0, 1fr)`, sin librería y con `gap: var(--space-4)`:
- Vehículos (`GRILLA` en `components/operaciones/VehiculosGrid.jsx`): 1 columna, 2 desde 992px.
- Equipos (`GRILLA` en `components/operaciones/clasesEquipos.js`): 1 columna, 2 desde 576px, 3 desde 992px.

Las tarjetas de una misma fila se igualan en alto solas (`align-items: stretch`),
no hace falta ninguna clase extra.

### Acceso (Login y Restablecer contraseña)
- `components/auth/AuthShell.jsx`: carcasa compartida (panel navy + riel de pasos + hoja del
  formulario). Sus estilos van con clases de Tailwind (`components/auth/clasesAuth.js`); lo que
  queda con prefijo `auth-` (`.auth-form`, las animaciones) es para no mezclarse con estilos
  globales de los modales (`.field-error` y similares).
- `components/auth/AuthRail.jsx`: el riel; cada paso es un nodo con texto y `aria-current`.
- `components/auth/OtpInput.jsx`: las 6 casillas del código (pegado, retroceso y autocompletado).
- `components/shared/PasswordField.jsx`: campo de contraseña con mostrar/ocultar, usado también
  por el modal de cambiar contraseña. Pasar siempre `autoComplete` (`current-password` o
  `new-password`).
- `<Modal variant="seguridad">`: variante opcional del modal (entrada con trazo ámbar; hoja
  inferior en celular). Los demás modales no la usan.

### Al agregar algo nuevo
- Copiar la estructura del módulo más parecido que ya exista (por ejemplo
  `.usuario-card` para una tarjeta nueva) y usar las variables de `tokens.css`
  en vez de colores sueltos.
- Campos de un formulario en un modal: usar las constantes de
  `components/shared/clasesModal.js` (`CAMPO`, `FILA`, `ERROR_CAMPO`,
  `BOTON_SECUNDARIO`…). `form-field`, `form-row` o `btn-secondary` ya no dan
  estilo por sí solas: quedan solo como gancho de otras reglas.
- No nombrar una clase igual que una de un framework externo (`.card`, `.btn`,
  `.badge`, `.modal`…): ya hubo un choque real con `.modal` cuando se usaba
  Bootstrap.
