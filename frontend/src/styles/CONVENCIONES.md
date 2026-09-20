# Convenciones de estilo — Proyecto-Electro

## CSS propio (sin Bootstrap)

El proyecto **no usa Bootstrap ni `react-bootstrap`**. Todo el estilo sale de
`tokens.css` (colores, espaciados, tipografía, sombras), `base.css`, `buttons.css`,
`badges.css`, `filters.css`, `responsive.css` y el CSS de cada módulo.

### `base.css`
Conserva únicamente las reglas del antiguo "reboot" de Bootstrap que la interfaz
daba por hechas: `line-height: 1.5` en el `body`, márgenes y peso de los
encabezados, `vertical-align: middle` en los SVG, formularios que heredan la
fuente, `<legend>`/`<fieldset>` y tablas. No agregar estilos visuales ahí.

### Grillas de tarjetas
CSS Grid con `minmax(0, 1fr)`, sin librería y con `gap: var(--space-4)`:
- `.vehiculos-grid` (Vehículos): 1 columna, 2 desde 992px.
- `.equipos-grid` (Equipos): 1 columna, 2 desde 576px, 3 desde 992px.

Las tarjetas de una misma fila se igualan en alto solas (`align-items: stretch`),
no hace falta ninguna clase extra.

### Acceso (Login y Restablecer contraseña)
- `components/auth/AuthShell.jsx`: carcasa compartida (panel navy + riel de pasos + hoja del
  formulario). Sus clases llevan prefijo `auth-` para no mezclarse con estilos globales de los
  modales (`.field-error` y similares).
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
- No nombrar una clase igual que una de un framework externo (`.card`, `.btn`,
  `.badge`, `.modal`…): ya hubo un choque real con `.modal` cuando se usaba
  Bootstrap.
