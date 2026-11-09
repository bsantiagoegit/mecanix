# Feature `auth`

Pantallas de autenticación: iniciar sesión, registro y recuperación de contraseña. La **sesión** (estado, guard, servicio de Supabase Auth) no vive aquí sino en [`core/auth/`](../../core/auth/): esta feature solo aporta la UI. Ver [estructura](../../../../docs/architecture/frontend/structure.md) (caso especial `auth`).

## Casos de uso

Definidos en [`docs/domain/use-cases/01-auth.md`](../../../../docs/domain/use-cases/01-auth.md).

| ID         | Caso de uso                           | Prioridad | Estado                                                                                                                                     |
| ---------- | ------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| UC-AUTH-01 | Iniciar sesión con email y password   | MVP       | **Implementado** (`login-page`)                                                                                                            |
| UC-AUTH-02 | Cerrar sesión                         | MVP       | **Implementado**, pero el botón vive en el shell (`app/layout/shell`), no en esta feature                                                  |
| UC-AUTH-03 | Recuperar contraseña                  | MVP       | **Implementado** (`forgot-password-page` y `reset-password-page`)                                                                          |
| UC-AUTH-04 | Cambiar contraseña                    | Fase 2    | No iniciado                                                                                                                                |
| UC-AUTH-05 | Iniciar sesión con Google             | Fase 2    | No iniciado: el botón de `login-page` muestra un aviso ("próximamente")                                                                    |
| UC-AUTH-06 | Autenticación biométrica              | Fase 3    | No iniciado                                                                                                                                |
| UC-WS-04   | Aceptar invitación y acceder a la app | MVP       | **Implementado** (`accept-invitation-page`), definido en [onboarding de taller](../../../../docs/domain/use-cases/02-onboarding-taller.md) |
| UC-AUTH-07 | Registrarse (crear cuenta)            | MVP       | **Implementado** (`register-page`): crea la cuenta (con confirmación de email) sin taller                                                  |

El **registro** crea solo la cuenta. Quien se registra crea luego su propio taller y queda como `owner` (UC-WS-08, [ADR-012](../../../../docs/architecture/adr/ADR-012-onboarding-self-service.md), feature [`workshops`](../workshops/README.md)); los asesores y mecánicos entran por invitación del `owner` (UC-WS-03/04, aún no implementada). Un usuario autenticado sin taller es una sesión válida con `role` y `activeWorkshopId` en `null`. Flujos y estados en [onboarding de taller](../../../../docs/architecture/multi-tenant/workshop-onboarding.md).

## Estructura

```
features/auth/
├── pages/                    ← componentes enrutados
│   ├── login-page/           ← implementada
│   ├── register-page/        ← implementada
│   ├── accept-invitation-page/ ← implementada: el invitado elige su contraseña y entra
│   ├── forgot-password-page/ ← implementada: pide el correo y envía el enlace
│   └── reset-password-page/  ← implementada: elige la contraseña nueva desde el enlace
├── auth.routes.ts
└── README.md
```

No tiene `components/`: cada formulario vive dentro de su página porque no se reutiliza. Si una página crece o un formulario se necesita en otro sitio, se extrae a un componente presentacional (`input()`/`output()`, sin facades), según [D-FE-04](../../../../docs/architecture/frontend/decisions.md).

## Rutas

Cargadas con `loadChildren` bajo `/auth` (ver [`auth.routes.ts`](./auth.routes.ts)); son públicas, salvo `accept-invitation`, que exige `invitationGuard`.

| Ruta                      | Página                 | Estado                           |
| ------------------------- | ---------------------- | -------------------------------- |
| `/auth/login`             | `LoginPage`            | Implementada                     |
| `/auth/register`          | `RegisterPage`         | Implementada                     |
| `/auth/accept-invitation` | `AcceptInvitationPage` | Implementada (`invitationGuard`) |
| `/auth/forgot-password`   | `ForgotPasswordPage`   | Implementada                     |
| `/auth/reset-password`    | `ResetPasswordPage`    | Implementada                     |

`/auth` redirige a `/auth/login`. Las rutas protegidas (`/dashboard` y las que vengan) están bajo el shell con `workshopGuard`: sin sesión redirige a `/auth/login?returnUrl=...` y sin taller a `/onboarding/create-workshop`. Un usuario con una invitación pendiente no va a crear taller: `workshopGuard` y `onboardingGuard` lo mandan a `/auth/accept-invitation`. Los guards (`authGuard`, `workshopGuard`, `onboardingGuard`, `invitationGuard`) viven en [`core/auth/auth.guard.ts`](../../core/auth/auth.guard.ts).

## Flujo de inicio de sesión

1. `LoginPage` valida el formulario (Reactive Forms) y llama a `AuthFacade.login()`.
2. `AuthEffects` consulta Supabase (`AuthService.login`), resuelve el usuario, su rol y su taller (`users` y `workshop_members`) y emite `loginSuccess` o `loginFailure`.
3. Si hay error, la página muestra un mensaje legible: credenciales incorrectas, correo sin confirmar o error genérico.
4. Con sesión activa (`isAuthenticated`), la página navega a `returnUrl` (solo rutas internas) o a `/dashboard`.

## Flujo de registro

1. `RegisterPage` valida nombre, email, contraseña (mínimo 6, igual que `minimum_password_length` de `supabase/config.toml`) y su confirmación, y llama a `AuthFacade.register()`. El email usa `emailValidator` (`@shared/utils`): el de Angular más un dominio con extensión (`ana@example` no pasa), y `trimOnChange` quita los espacios al escribir o pegar.
2. `AuthService.register` crea la cuenta en Supabase Auth con `full_name` en el metadata; el trigger `handle_new_auth_user` crea la fila de `users`. La confirmación de email está activada (`enable_confirmations = true`), así que no se abre sesión; si Supabase abriera una, se cierra.
3. Con éxito, la página dice que se envió un correo de confirmación. Con error, muestra un mensaje legible (email ya registrado, contraseña débil o genérico).
4. El usuario abre el enlace del correo: Supabase abre sesión y la app lo lleva a `/onboarding/create-workshop` (cuenta sin taller). Si abre `/auth/login?confirmed=1` sin sesión, `LoginPage` avisa que el correo quedó confirmado.
5. Antes de confirmar, el login falla con "Confirma tu correo…" (`EmailNotConfirmedError`). Confirmado y sin taller, el login entra y lleva a crear el taller.

**En local**, los correos no salen a Internet: llegan a Mailpit (<http://127.0.0.1:54324>). Si alguien se registra con un email que ya existe, Supabase responde como si hubiera funcionado (para no revelar qué correos tienen cuenta) y la página muestra el mismo aviso de confirmación.

## Dependencias

- `@core/auth`: `AuthFacade` (acciones y signals de la sesión) y los guards.
- `@shared/components`: `Button`, `Card`, `Input`. `@shared/services`: `ToastService`.
- No importa de otras features.

## Pendiente

- Login con Google (UC-AUTH-05, Fase 2): el botón sigue mostrando "próximamente".
- Invitaciones: falta reenviar, cancelar borrando la cuenta de Auth y explicar los enlaces caducados (ver [`features/workshops`](../workshops/README.md)).
- El correo de confirmación del registro sigue en inglés (plantilla por defecto de Supabase); invitación y recuperación ya están en español.

## Recuperar la contraseña (UC-AUTH-03)

1. `ForgotPasswordPage` pide el correo (`emailValidator`) y llama a `AuthService.forgotPassword`, que usa `resetPasswordForEmail` con redirección a `/auth/reset-password`. La respuesta es **la misma exista o no la cuenta** ("Si existe una cuenta con…") para no revelar qué correos están registrados; solo el límite de envíos (`over_email_send_rate_limit`) se informa aparte.
2. El correo (plantilla en español, `supabase/templates/recovery.html`) trae un enlace que caduca en una hora (`otp_expiry`) y es de un solo uso.
3. Al abrirlo, Supabase abre una sesión de recuperación (`detectSessionInUrl`) y vuelve a `/auth/reset-password`. `ResetPasswordPage` comprueba con `AuthService.hasSession()` que el enlace abrió una sesión: si no (caducó, ya se usó o se entró a mano a la URL), explica y ofrece pedir otro.
4. Con sesión, pide la contraseña nueva y su confirmación. `AuthService.recoverPassword` la fija (`updateUser`) y, como mejora de seguridad, **cierra las demás sesiones** de la cuenta (`signOut({ scope: 'others' })`, mejor esfuerzo).
5. Se avisa con un toast, se vuelve a resolver la sesión y se entra a la app; los guards llevan a quien no tenga taller a crearlo o a aceptar su invitación.
6. Errores: contraseña igual a la actual (`same_password`), débil (`weak_password`) y sesión perdida (`no_session`) se explican; todos son `PasswordRecoveryError`.

El estado de ambas pantallas es local (signals): no hay slice de NgRx.

## Aceptar una invitación (UC-WS-04)

1. El invitado abre el enlace del correo. Supabase valida el token, confirma el correo y vuelve a `/auth/accept-invitation` con una sesión abierta (`detectSessionInUrl`).
2. `AuthService` resuelve la sesión: sin membresía activa, consulta `get_pending_invitation()` y la guarda en `AuthSession.invitation` (taller y rol). Se persiste con el resto de la sesión para que recargar la página no lo mande a crear un taller.
3. `AcceptInvitationPage` muestra el taller y el rol, y pide la contraseña. Al enviar: guarda la contraseña (`AuthService.setPassword`, es `updateUser`), activa la membresía con `accept_invitation()` y vuelve a resolver la sesión; con taller, entra a `/dashboard`.
4. La contraseña se guarda **una sola vez**: si aceptar falla y el usuario reintenta, no se vuelve a guardar, porque Supabase rechaza fijar la misma contraseña.
5. Si la invitación ya no existe (la cancelaron), se sincroniza la sesión y, al no tener invitación ni taller, el usuario queda en `/onboarding/create-workshop`.

## Tests

- `login-page.spec.ts`: navegación tras autenticar, `returnUrl` interno, mensaje de error y enlaces.
- `register-page.spec.ts`: validaciones (incluido el dominio del email y los espacios), envío, error, aviso de correo enviado y enlaces.
- `forgot-password-page.spec.ts` y `reset-password-page.spec.ts`: validaciones, respuesta neutra, límite de envíos, enlace inválido, errores de contraseña y entrada a la app tras cambiarla.
- `accept-invitation-page.spec.ts`: taller y rol visibles, validaciones, orden contraseña → aceptar, reintento sin volver a guardar la contraseña, invitación cancelada, sesión expirada y entrada al dashboard.
- `@shared/utils`: `email.validator.spec.ts` y `trim-on-change.spec.ts`.
- La lógica de sesión se prueba en `core/auth`: `auth.reducer.spec.ts` y las redirecciones de `auth.effects.spec.ts`. `auth.service.spec.ts` cubre `AuthService` (login, `restoreSession`, `roleIn`, registro, recuperación, `setPassword`, invitaciones, Google) con un cliente de Supabase falso. Los tests de integración de RLS están en `supabase/tests/`.
