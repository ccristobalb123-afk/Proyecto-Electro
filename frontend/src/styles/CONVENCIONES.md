# Convenciones de estilo — Proyecto-Electro

## Tailwind y CSS propio (sin Bootstrap)

El proyecto **no usa Bootstrap ni `react-bootstrap`**. El estilo de cada
pantalla y componente va en clases de Tailwind (en el `className` o en
constantes `clases*.js`), con los valores de `tokens.css` (colores,
espaciados, tipografía, sombras). Además quedan `base.css` y `etiquetas.css`
(base), `buttons.css`, `badges.css` y `filters.css` (clases globales),
`foco.css`, `responsive.css`, `motion.css` y `tarjetas.css` (ajustes que
ganan siempre) y, en el `.css` de algunos módulos, solo `@keyframes` y las
reglas que una clase no puede reemplazar. La migración está cerrada y su
criterio de «terminada» se cumple sin excepciones (desde el paso 5b, en que
el margen de `.auth-form .password-field` pasó a clases). El criterio, el
inventario de cada `.css` y la tabla de lo que queda sin capa están en
«Cierre de la migración» de `frontend/docs/tailwind.md`.

### Tailwind y capas
Tailwind 4, sin preflight y en capas. Orden, de menor a mayor
prioridad:

1. `base`: `base.css` y después `etiquetas.css` (estilos de etiqueta).
2. `components`: `buttons.css` (con `.btn-primary`), `badges.css` y
   `filters.css`, en ese orden. Las clases de Tailwind les ganan.
3. `utilities`: las clases de Tailwind.
4. Sin capa (siempre gana): las variables y `.sr-only` de `tokens.css`,
   `foco.css` (la regla global de foco y sus excepciones), `responsive.css`
   (celular y 44 px táctiles), `motion.css` (movimiento reducido),
   `tarjetas.css` (borde de tarjetas) y lo que queda en el CSS de cada
   módulo (cada regla dice por qué no es una clase).

**Regla de oro: lo que está sin capa le gana a cualquier clase de
Tailwind**, sin importar la especificidad ni el orden. Los cuatro archivos sin
capa a propósito (`foco.css`, `responsive.css`, `motion.css`, `tarjetas.css`)
son "ajustes que ganan siempre": si una regla de ahí toca una propiedad,
ninguna clase la puede cambiar. Para cambiar el
anillo de foco de un control, agrega la excepción en `foco.css`, con su
motivo y un selector de más de 0-1-1 de especificidad (desde el paso 4
también está ahí `.btn-seguir-conectado:focus-visible`, del aviso de
inactividad). Uso, tabla token → clase, breakpoints, reglas de
convivencia y la lista completa de lo que queda sin capa en
`frontend/docs/tailwind.md`.

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
de foco (`input/button:focus-visible`) se queda sin capa, en `foco.css`.

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

### Código nuevo: cómo crear un componente

1. **Clases directas.** El estilo va en el `className` con clases de Tailwind
   (tabla token → clase y breakpoints en `docs/tailwind.md`). Escribe cada
   clase completa: `` `bg-${color}` `` no existe para Tailwind; usa
   `ok ? "bg-success-tint" : "bg-danger-tint"`.
2. **Constantes.** Si un grupo de clases es largo o se repite, ponlo en una
   constante en MAYÚSCULAS. Si la usa un solo componente, puede ir arriba en
   el mismo archivo; si la comparten varios, va en el `clases*.js` de su
   área, o en `components/shared/` si la usan dos áreas. Antes de crear una,
   busca en la lista de abajo: tarjetas, pestañas, modales, campos y fichas
   ya tienen la suya.
3. **Tokens.** Ningún color, radio, sombra ni tamaño de letra suelto. Si
   falta un valor, se agrega primero la variable a `tokens.css` y luego su
   clase en el `@theme inline` de `tailwind.css`. Algo puntual sin token:
   `w-[290px]`, o un token sin clase: `p-(--space-4)`.
4. **CSS propio, solo en tres casos** (en el `.css` del componente, importado
   desde su `.jsx`, con un comentario que diga por qué):
   - un `@keyframes` (se usa con `animate-[nombre_2s_ease-in-out]`);
   - una regla que tiene que ganarle a otra regla sin capa sobre el mismo
     elemento (regla 9 de `docs/tailwind.md`);
   - un selector que depende de otro componente que no recibe clases o de su
     estado (ej. `body:has(.modal-overlay.open)`).

   Todo lo demás es una clase. Anota la regla en la fila de su módulo en
   «Migrado» de `docs/tailwind.md`.
5. **Táctil y movimiento reducido.** No los resuelvas con clases: agrega el
   selector a `responsive.css` (44 px táctiles) o a `motion.css`, con `html`
   delante, y deja en el JSX una clase **gancho** (sin estilo propio),
   anotada en el comentario de la constante.
6. **Foco.** No quites ni cambies el anillo con clases: la regla global de
   `foco.css` está sin capa y les gana. Agrega la excepción en `foco.css`,
   después de la regla global, con un selector de más de 0-1-1 de
   especificidad (ej. `.mi-buscador input:focus`), su motivo, y la clase
   gancho en el JSX.
7. **No uses `!`** (`p-2!`) para ganarle a una regla sin capa: si te hace
   falta, es el caso 4 o el 5.
8. **Nombres.** No nombres una clase igual que una de un framework externo
   (`.card`, `.btn`, `.badge`, `.modal`…): ya hubo un choque real con
   `.modal` cuando se usaba Bootstrap.

### Cómo verificar que no cambia nada visible

Para migrar o retocar algo que ya existe:

- Capturas y estilos calculados de cada elemento, antes y después, a 360 px
  táctil y 1280 px con ratón (y en iPhone, `html.es-ios`, o con
  `prefers-reduced-motion` si el componente tiene reglas para eso), en
  reposo, hover, pulsado, foco de teclado y deshabilitado. Una primera
  sesión de calentamiento descartada, fechas fijas (reloj simulado del
  navegador; nunca un modo de prueba en el código) y el pulso o las
  animaciones congelados. Dos corridas iguales tienen que dar cero
  diferencias antes de comparar.
- Compilar en una carpeta aparte, fuera de git:
  `npx vite build --outDir <carpeta>/dist-prueba --emptyOutDir`. **No**
  `npm run build`: escribe en `frontend/dist`, que es lo publicado.
- `npm run lint` sin subir de 12 avisos.
- Revisar «Detalles que cambian el estilo calculado» de `docs/tailwind.md`
  (`rounded-full` no es 50 %, `border-none` no es `border: none`, `transform`
  frente a `scale`/`rotate`…).

### Archivos de clases compartidas

| Archivo | Para qué |
|---|---|
| `components/shared/clasesModal.js` | modal compartido y campos de formulario de los modales (`CAMPO`, `FILA`, `ERROR_CAMPO`, `AYUDA`, `AVISO…`, `DROPZONE…`, `OPCION…`, `BOTON_SECUNDARIO`, `RECUADRO…`, visor). `form-field`, `form-row` y `btn-secondary` ya no dan estilo: solo son ganchos |
| `components/shared/clasesTarjeta.js` | tarjetas de lista: base, encabezado, rótulo de cada dato, pie, grilla, etiqueta de estado y avatar (Administración, Finanzas, RRHH en celular; Equipos usa el rótulo y el estado) |
| `components/shared/clasesPestanas.js` | pestañas de pantalla (Finanzas, RRHH, Operaciones) |
| `components/shared/clasesFicha.js` | fichas desplegables por persona o camión (RRHH > Cursos / EMO, Operaciones > Asignaciones) |
| `components/shared/clasesDocumento.js` | chip de documento («Ver PDF», «Adjuntar», «Subiendo…»): RRHH, `BotonVerArchivo` y documentos del vehículo |
| `components/shared/clasesCarga.js` | pantalla de carga a pantalla completa (`PANTALLA_CARGANDO`) |
| `components/shared/clasesAviso.js` | aviso de inactividad |
| `components/auth/clasesAuth.js` | formularios del acceso (Login y Restablecer contraseña) |
| `components/finanzas/clasesFinanzas.js` | tarjetas de Finanzas (facturas, por pagar, gastos) y el rótulo del modal de registrar pago |
| `components/operaciones/clasesEquipos.js` | pestaña Equipos (grupos y tarjetas) y el aviso «Faltan datos» |
| `components/rrhh/clasesRrhh.js` | RRHH: tabla y tarjetas de Contratos, fichas de Cursos / EMO y detalle |
