# Onboarding de taller e invitaciones

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Noviembre 2026
- **Decisiones:** [ADR-012](../adr/ADR-012-onboarding-self-service.md) y [ADR-013](../adr/ADR-013-invitaciones-edge-function.md)

---

## Propósito

Describir cómo una persona llega a pertenecer a un taller: creándolo ella misma (dueño) o aceptando una invitación del dueño (asesor o mecánico). Cubre las reglas, los estados de la sesión, los contratos de las funciones de servidor y el comportamiento como PWA.

---

## Reglas

1. **Un taller por cuenta.** Un usuario tiene como máximo una membresía no `inactive`.
2. **Quien crea el taller es su `owner`**, y es el único del taller. El `owner` no se invita.
3. **Solo el `owner` invita**, y solo a `advisor` o `mechanic`.
4. **Nadie inserta membresías desde el cliente.** Se crean en `create_workshop` (`owner`) y en la Edge Function `invite-user` (invitados); se activan en `accept_invitation`.
5. **MVP**: se invita únicamente a correos sin cuenta. Si el correo ya está registrado, la invitación se rechaza.

---

## Estados de la sesión

Tras autenticarse, la app resuelve en qué situación está el usuario. "Sin taller" es una sesión válida con `role` y `activeWorkshopId` en `null`, no un error. **Implementado** los tres. La invitación pendiente se guarda en `AuthSession.invitation` (taller y rol, vía `get_pending_invitation()`) y solo existe mientras no haya taller.

| Estado                   | Condición                           | Destino                       |
| ------------------------ | ----------------------------------- | ----------------------------- |
| **Con taller**           | Membresía `active`                  | Dashboard                     |
| **Invitación pendiente** | Membresía `invited`                 | `/auth/accept-invitation`     |
| **Sin taller**           | Sin membresía `active` ni `invited` | `/onboarding/create-workshop` |

Guards (`core/auth/auth.guard.ts`): `workshopGuard` protege las rutas de la app (exige sesión y taller; sin taller lleva a aceptar la invitación si la tiene, o a crear el suyo); `onboardingGuard` protege `/onboarding` (exige sesión y ausencia de taller; con invitación pendiente va a aceptarla; con taller vuelve a `/`); `invitationGuard` protege `/auth/accept-invitation` (exige una invitación pendiente); `authGuard` solo exige sesión.

---

## Flujo 1: crear mi taller (UC-WS-08)

```
1. La persona se registra (UC-AUTH-07) y confirma su correo.
2. Inicia sesión → estado "sin taller" → /onboarding/create-workshop.
3. Completa nombre, dirección y teléfono del taller, y opcionalmente elige un logo.
4. La app llama a la función create_workshop(name, address, phone).
5. La función, en una sola transacción:
     - rechaza si el usuario ya tiene una membresía no inactiva (un taller por cuenta)
     - inserta el taller con los valores por defecto
     - inserta la membresía { role: 'owner', status: 'active', joined_at: now() }
6. Si eligió un logo (el usuario ya es owner): la app lo redimensiona, lo sube al bucket
   público `logos` en {workshop_id}/{uuid}.{ext} y guarda la URL en workshops.logo_url.
7. La app refresca la sesión → estado "con taller" → dashboard.
```

El logo se sube **después** de crear el taller porque solo el `owner` puede escribir en `logos` y el usuario lo es recién tras el paso 5. Si la subida falla, el taller ya existe: la app avisa "Taller creado, pero no se pudo subir el logo" y el `owner` puede subirlo desde la configuración (UC-WS-02). No se bloquea el onboarding por el logo.

`create_workshop` es `SECURITY DEFINER` con `search_path` fijo y toma el usuario de `auth.uid()`. El resto de la configuración (capacidad, fotos mínimas, expiración de cotización, garantía, moneda, zona horaria) se ajusta luego en UC-WS-02.

---

## Flujo 2: invitar a un usuario (UC-WS-03)

```
1. El owner abre "Equipo" y pulsa "Invitar usuario".
2. Completa nombre completo, correo, teléfono y rol (advisor | mechanic).
3. La app llama a la Edge Function invite-user con el JWT del owner.
4. La función valida (ver contrato) e invoca inviteUserByEmail.
5. Supabase envía el correo de invitación; la membresía queda en 'invited'.
6. El owner ve al invitado en la lista con estado "Invitado".
```

### Contrato de `invite-user`

**Entrada** (JSON, con `Authorization: Bearer <JWT del owner>`):

| Campo      | Tipo   | Reglas                               |
| ---------- | ------ | ------------------------------------ |
| `email`    | string | Formato válido; sin cuenta existente |
| `fullName` | string | Obligatorio                          |
| `phone`    | string | Obligatorio                          |
| `role`     | string | `advisor` o `mechanic`               |

**Validaciones, en orden**:

1. El JWT es válido y el usuario es `owner` activo de su taller (se consulta con `service_role`; el taller sale de la membresía, nunca del cuerpo de la petición).
2. `role` permitido.
3. El correo no tiene cuenta en `auth.users`.

**Efectos**: `inviteUserByEmail(email, { data: { full_name, phone }, redirectTo })` y `INSERT` de la membresía `{ workshop_id, user_id, role, status: 'invited', invited_at: now() }`. Si el `INSERT` falla, se elimina el usuario recién creado para no dejar cuentas huérfanas.

**Errores**: `401` sin sesión, `403` si no es `owner`, `409` correo ya registrado, `422` datos inválidos.

**Respuesta**: `201 { userId, email, role }`. Los errores llevan `{ "error": "<código>" }`: `not_authenticated`, `not_owner`, `invalid_input`, `email_already_registered`, `invitation_failed`, `method_not_allowed`, `misconfigured`.

**Detalles de implementación** (`supabase/functions/invite-user/index.ts`):

- El gateway no verifica el JWT (`verify_jwt = false`): la función lo valida con `auth.getUser` para responder `401` con su propio contrato.
- No consulta si el correo existe: llama a `inviteUserByEmail` y traduce `email_exists` a `409`. Así no hay carrera entre la comprobación y la invitación.
- El nombre y el teléfono viajan en `user_metadata`; el trigger `handle_new_auth_user` los copia a `users`.
- El correo se normaliza (minúsculas, sin espacios). Un `workshopId` en el cuerpo se ignora.
- La plantilla del correo está en `supabase/templates/invite.html` (configurada en `[auth.email.template.invite]`).

**Local**: `supabase functions serve` (lee `APP_URL` de `[edge_runtime.secrets]`). En producción, `APP_URL` es un secreto del proyecto.

**Configuración**: la clave `service_role` y la URL de la app (`APP_URL`) son variables de entorno de la función, nunca del cliente. `redirectTo` apunta a `${APP_URL}/auth/accept-invitation` y debe estar en `additional_redirect_urls` de `supabase/config.toml`.

### Reenviar y cancelar

> **Estado**: la pantalla "Equipo" ya permite cancelar. Reenviar y borrar la cuenta de Auth al cancelar quedan para una iteración posterior de la Edge Function; mientras tanto, volver a invitar un correo cancelado responde `409`.

- **Reenviar**: mientras la membresía esté `invited`, el `owner` puede pedir otro envío (la función vuelve a invocar la invitación). Sirve cuando el enlace caducó (`otp_expiry`) o el correo se perdió.
- **Cancelar**: el `owner` pasa la membresía de `invited` a `inactive`. El enlace deja de dar acceso a un taller.

---

## Flujo 3: aceptar la invitación (UC-WS-04)

```
1. El invitado abre el enlace del correo. Se abre en el navegador, en la URL de la app.
2. Supabase valida el token, confirma el correo y abre una sesión.
3. La app detecta el estado "invitación pendiente" → /auth/accept-invitation.
4. La pantalla muestra el taller y el rol, y pide fijar una contraseña.
5. La app guarda la contraseña (updateUser) y llama a accept_invitation().
6. accept_invitation() pasa la membresía de 'invited' a 'active' (joined_at = now())
   y solo actúa sobre la membresía del propio usuario (auth.uid()).
7. La app refresca la sesión → "con taller" → dashboard.
```

Mientras no acepte, el usuario no tiene contraseña ni acceso: la invitación no concede nada hasta el paso 6.

**Detalles de implementación**: la contraseña se guarda antes de aceptar y solo una vez (si aceptar falla y se reintenta no se vuelve a guardar, porque Supabase rechaza la misma contraseña). Si la invitación ya no existe (el `owner` la canceló), `accept_invitation()` responde `no_pending_invitation`; la app sincroniza la sesión y, sin invitación ni taller, el usuario va a crear el suyo. Si el enlace caducó o ya se usó, no hay sesión y se llega al login: hace falta reenviar la invitación (pendiente).

---

## Comportamiento como PWA

La app es una PWA que corre en el navegador. El enlace del correo **abre el navegador** en la URL de la app (no hay enlace profundo a una app nativa). Desde ahí:

1. El usuario acepta la invitación y entra a la app.
2. La app puede ofrecerle instalarla (`InstallService`, evento `beforeinstallprompt`; en iOS, las instrucciones de "Añadir a pantalla de inicio").
3. Una vez instalada, se usa como una app más.

**Nota para iOS**: la app instalada tiene almacenamiento separado del navegador, así que la sesión iniciada en Safari no pasa a la app instalada. Tras instalar, el usuario inicia sesión una vez más con su correo y la contraseña que fijó al aceptar.

Ver [PWA online-first](../adr/ADR-006-pwa-online-first.md) y [`pwa-offline/`](../pwa-offline/).

---

## Cambios en la base de datos

| Cambio                                                                                                                                                      | Para qué                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| Índice único parcial `workshop_members(user_id)` donde `status IN ('active','invited')`                                                                     | Un taller por cuenta                           |
| Índice único parcial `workshop_members(workshop_id)` donde `role = 'owner'` y `status <> 'inactive'`                                                        | Un solo `owner` por taller                     |
| Función `create_workshop(name, address, phone)`                                                                                                             | Flujo 1                                        |
| Función `accept_invitation()`                                                                                                                               | Flujo 3                                        |
| Función `get_pending_invitation()`                                                                                                                          | Mostrar taller y rol en la pantalla de aceptar |
| Eliminar la policy `workshop_members_insert_owner`                                                                                                          | Nadie inserta membresías desde el cliente      |
| Bucket público `logos`, sus policies de escritura para el `owner` y el CHECK `workshops_logo_url_valid` ([ADR-014](../adr/ADR-014-bucket-publico-logos.md)) | Logo del taller (UC-WS-08 y UC-WS-02)          |

### `get_pending_invitation()`

Devuelve `(workshop_name, role)` de la membresía `invited` del propio usuario, o cero filas si no hay. Existe porque un invitado aún no es miembro activo y `workshops_select_member` no le deja leer el taller; la función expone solo el nombre y el rol, y solo de su propia invitación. Es `SECURITY DEFINER` con `search_path` fijo y no se concede a `anon`.

### Errores de las funciones

Las funciones lanzan una excepción cuyo `message` es un código estable que la app traduce a un texto para el usuario.

| Función             | `message`                   | Cuándo                                            |
| ------------------- | --------------------------- | ------------------------------------------------- |
| `create_workshop`   | `not_authenticated`         | Sin sesión                                        |
|                     | `email_not_confirmed`       | El correo del usuario no está confirmado          |
|                     | `invalid_workshop_data`     | Nombre, dirección o teléfono vacíos               |
|                     | `user_already_has_workshop` | Ya tiene una membresía `active` o `invited`       |
| `accept_invitation` | `not_authenticated`         | Sin sesión                                        |
|                     | `no_pending_invitation`     | No hay una membresía `invited` del propio usuario |

El trigger `protect_workshop_member_update` solo restringe al rol `authenticated`: dentro de las funciones `SECURITY DEFINER` y con `service_role` no aplica. Rechaza con `workshop_member_identity_immutable` (cambiar `user_id` o `workshop_id`) e `invitation_must_be_accepted_by_invitee` (pasar de `invited` a `active`).

Detalle en [tablas de tenancy](../data-model/tables/01-tenancy.md) y [policies de tenancy](../security/policies/01-tenancy.md).

---

## Fuera de alcance del MVP

- Invitar a un correo que ya tiene cuenta.
- Varios talleres por cuenta y selector de taller.
- Transferir la propiedad del taller o tener varios `owner`.
- Límites y planes por taller (UC-SAAS-07, Fase 3).

---

## Referencias

- [ADR-012: Onboarding self-service](../adr/ADR-012-onboarding-self-service.md)
- [ADR-013: Invitaciones por Edge Function](../adr/ADR-013-invitaciones-edge-function.md)
- [Casos de uso: Onboarding de Taller](../../domain/use-cases/02-onboarding-taller.md)
- [Casos de uso: Autenticación](../../domain/use-cases/01-auth.md)

---

_Onboarding de taller v1.0 — Documento vivo._
