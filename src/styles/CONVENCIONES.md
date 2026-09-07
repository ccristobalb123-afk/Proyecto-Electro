# Convenciones de estilo — Proyecto-Electro

## Bootstrap vs. CSS propio

Regla simple: **Bootstrap solo para el grid responsivo de tarjetas. Todo lo demás es CSS propio.**

### Se usa Bootstrap (`react-bootstrap`) para:
- `<Row>` / `<Col>` — el layout en grid de tarjetas que se acomodan solas
  según el ancho de pantalla (Equipos, Vehículos). Es lo único que
  Bootstrap resuelve mejor que un CSS Grid a mano: columnas responsivas
  con breakpoints (`xs`, `sm`, `lg`, `xl`) y `h-100` para igualar alturas.
- `<Navbar>` / `<Navbar.Toggle>` / `<Navbar.Collapse>` — si en algún
  momento se arma un navbar colapsable, usar los componentes de
  react-bootstrap en vez de manejar `data-bs-toggle` a mano.

### Todo lo demás usa el CSS propio del proyecto (`tokens.css`,
`buttons.css`, `badges.css`, y el CSS de cada módulo):
- Botones (`.btn-primary`, `.btn-outline-sm`, `.btn-danger`, `.icon-btn`)
- Formularios (`.form-field`, `.form-row`, inputs, selects)
- Modales (`Modal.jsx` + `Modal.css`)
- Tarjetas (`.equipo-card`, `.vehiculo-card`, `.usuario-card`, `.fin-card`,
  `.kpi-card`, `.panel`)
- Badges y estados (`.co-badge`, `.estado`, `.tag`)
- Tablas (`.table-scroll`, RRHH)

### Por qué esta separación
El proyecto tiene un sistema de diseño propio bastante desarrollado
(`tokens.css`: colores, espaciados, tipografía, sombras) que ya resuelve
todo lo visual. Meter clases de Bootstrap (`.card`, `.btn`, `.badge`,
`.form-control`) ahí encima generaría dos sistemas de estilos compitiendo
por la misma clase (ej. el choque real que ya tuvimos con `.modal`), y
además le daría a la app un aspecto genérico de Bootstrap por encima del
diseño ya construido. Bootstrap se queda estrictamente en su rol de
"resolver el grid responsivo", nada de estética.

### Al agregar algo nuevo
- ¿Es una grilla de tarjetas que se reacomoda según el ancho de pantalla?
  → `<Row>`/`<Col>` de react-bootstrap.
- ¿Es cualquier otra cosa (botón, formulario, modal, tabla, badge)?
  → CSS propio, siguiendo el patrón del módulo más parecido que ya
  exista (copiar la estructura de `.usuario-card` para una tarjeta nueva,
  por ejemplo), y usando las variables de `tokens.css` en vez de colores
  sueltos.
