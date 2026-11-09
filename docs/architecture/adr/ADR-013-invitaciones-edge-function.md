# ADR-013: Invitaciones de usuarios mediante Edge Function e invitación de Supabase Auth

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-11
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

El `owner` debe poder incorporar a asesores y mecánicos: registra al nuevo usuario (nombre, correo, teléfono y rol), el sistema le envía una invitación por correo, y la persona la acepta y accede a la app. Como la app es una PWA, el enlace del correo abre el navegador en la URL de la app; desde ahí el usuario puede instalarla.

Restricciones del modelo actual:

- `workshop_members.user_id` referencia a `users`, que espeja a `auth.users`: el usuario debe existir antes de tener membresía.
- Crear un usuario e invitarlo por correo requiere la API de administración de Supabase Auth (`auth.admin.inviteUserByEmail`), que solo acepta `service_role`. Esa clave **nunca** puede estar en el cliente.
- Las policies actuales impiden que un `owner` busque cuentas por correo, y no debe poder hacerlo.

---

## Decisión

Las invitaciones las gestiona una **Supabase Edge Function** `invite-user` y el correo lo envía la **invitación nativa de Supabase Auth**. No se crea una tabla `invitations`: la propia membresía con `status = 'invited'` es la invitación.

Flujo resumido (detalle en [onboarding de taller](../multi-tenant/workshop-onboarding.md)):

1. El `owner` envía `{ email, fullName, phone, role }` a la Edge Function con su JWT.
2. La función verifica que quien llama es `owner` activo de un taller y que `role` es `advisor` o `mechanic` (el `owner` no se invita).
3. Con `service_role`, invoca `inviteUserByEmail` (metadata: `full_name`, `phone`; `redirectTo` a la URL de la app) y crea la membresía `invited`. El trigger `handle_new_auth_user` crea la fila de `users`.
4. El invitado abre el enlace, llega a la app en el navegador, fija su contraseña y acepta. Una función `accept_invitation()` pasa la membresía a `active`.

Solo el `owner` invita. Se elimina la policy `workshop_members_insert_owner`: nadie inserta membresías directamente desde el cliente; solo `create_workshop`, la Edge Function y `accept_invitation`.

---

## Alternativas consideradas

### Alternativa A: Tabla `invitations` con token propio

- **Descripción**: el `owner` crea una fila con correo, rol y un token; el correo se envía desde una función propia y el invitado se registra con ese token.
- **Ventajas**: control total del flujo y del contenido.
- **Desventajas**: hay que construir el envío de correo (igualmente necesita una función de servidor y un SMTP), gestionar tokens, caducidad y reintentos, y unir el registro con la invitación.
- **Razón de descarte**: reimplementa lo que Supabase Auth ya hace (token firmado, caducidad, confirmación implícita del correo).

### Alternativa B: El `owner` crea la cuenta con una contraseña temporal

- **Descripción**: se registra al usuario directamente y se le comunica una contraseña.
- **Ventajas**: sin correo.
- **Desventajas**: el `owner` conoce la contraseña; el correo no queda verificado; mala práctica de seguridad.
- **Razón de descarte**: inseguro.

### Alternativa C: Que el invitado se registre solo y el `owner` lo agregue después

- **Descripción**: la persona usa `/auth/register` y luego el `owner` la busca por correo.
- **Ventajas**: sin Edge Function.
- **Desventajas**: el `owner` necesitaría buscar cuentas ajenas por correo (filtración de qué correos existen); con "un taller por cuenta", quien se registra solo ya crea su propio taller.
- **Razón de descarte**: choca con ADR-012 y con el aislamiento entre talleres.

---

## Consecuencias

### Positivas

- Reutiliza token, caducidad y verificación de correo de Supabase Auth.
- La clave `service_role` queda en el servidor (variable de la Edge Function).
- No hay tabla nueva: el estado `invited` ya existe en `workshop_members.status`.

### Negativas

- Introduce **Edge Functions (Deno)** como infraestructura nueva: hay que escribirlas, desplegarlas y probarlas. El job `Database` de la CI arranca Supabase sin `edge-runtime`, por lo que las pruebas de la función requieren otro job o ejecutarse en local.
- **MVP**: solo se invita a correos que **no** tienen cuenta. Si el correo ya está registrado, la función responde con un error. Una cuenta existente crea su propio taller (ADR-012).
- La sesión debe distinguir tres estados: con taller, con invitación pendiente y sin taller (ver el documento de flujo).
- El tiempo de validez del enlace lo fija `otp_expiry` de Auth; el `owner` puede reenviar la invitación.

### Neutras

- El correo de invitación usa la plantilla `invite` de Supabase (configurable en `supabase/config.toml`); en local llega a Mailpit.
