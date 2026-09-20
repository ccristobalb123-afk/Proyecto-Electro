# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Personal administrativo y operativo de CorevexSAC y ElectroSAC (administración, RRHH, finanzas y operaciones). Entran a diario desde una PC de oficina y también desde celular o tablet, por lo que ambos tamaños de pantalla son de primera clase. Los roles determinan a qué módulos accede cada persona.

## Product Purpose
Activo360 es un sistema de gestión interno para las dos empresas: RRHH (contratos, cursos y certificaciones), equipos y vehículos, finanzas (facturas por cobrar y por pagar, gastos, detracciones) y administración de usuarios, con alertas de vencimiento automáticas. Éxito: que el personal encuentre y actualice lo que necesita sin errores y sin perder de vista los vencimientos.

## Positioning
Un solo sistema para las dos empresas (CorevexSAC, la principal, y ElectroSAC), en lugar de una herramienta por empresa.

## Operating Context
- Acceso con usuario y contraseña, más verificación en dos pasos (código de app autenticadora; el QR de configuración se muestra solo la primera vez).
- La recuperación de contraseña es por correo con un enlace que vence a los 30 minutos.
- Hay un cambio de contraseña obligatorio cuando corresponde y uno voluntario desde la sesión.
- Sesión con aviso de inactividad.
- Moneda en soles y régimen de detracciones de SUNAT (Perú); interfaz en español.

## Capabilities and Constraints
- Solo se inicia sesión con nombre de usuario; el correo se usa únicamente para recuperar la contraseña.
- El Login tiene cinco pasos: credenciales, configuración de MFA, código MFA, recuperación y confirmación de envío.
- El modal de cambiar contraseña tiene dos modos: obligatorio (sin cierre ni contraseña actual) y voluntario.
- `Modal.css` es compartido por unos 20 modales; `Login.css` es compartido por Login y Restablecer contraseña.

## Brand Commitments
Vinculantes, confirmados por el equipo:
- Wordmark «Activo360», con el «360» en ámbar.
- Paleta actual: navy oscuro, azul de acento y ámbar.
- Tipografías actuales: Space Grotesk (títulos), Inter (texto) y JetBrains Mono (códigos).

Libres para rediseñar: el patrón de circuito del panel izquierdo del Login y cualquier otro elemento no listado arriba.

## Evidence on Hand
No hay logos de CorevexSAC ni de ElectroSAC, ni fotografías reales de obra, equipos o camiones. Ninguna pantalla debe simular logos, fotos, clientes ni cifras.

## Product Principles
- Seriedad de sistema empresarial: el rediseño no debe parecer una aplicación de consumo.
- Móvil y escritorio por igual: ninguno es un caso secundario.
