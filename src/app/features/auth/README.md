# Feature `auth`

Pantallas de autenticación: iniciar sesión, registro y recuperación de contraseña. La **sesión** (estado, guard, servicio de Supabase Auth) no vive aquí sino en [`core/auth/`](../../core/auth/): esta feature solo aporta la UI. Ver [estructura](../../../../docs/architecture/frontend/structure.md) (caso especial `auth`).

## Casos de uso

Definidos en [`docs/domain/use-cases/01-auth.md`](../../../../docs/domain/use-cases/01-auth.md).

| ID         | Caso de uso                         | Prioridad | Estado                                                                                    |
| ---------- | ----------------------------------- | --------- | ----------------------------------------------------------------------------------------- |
| UC-AUTH-01 | Iniciar sesión con email y password | MVP       | **Implementado** (`login-page`)                                                           |
| UC-AUTH-02 | Cerrar sesión                       | MVP       | **Implementado**, pero el botón vive en el shell (`app/layout/shell`), no en esta feature |
| UC-AUTH-03 | Recuperar contraseña                | MVP       | **Pendiente de UI**: `forgot-password-page` y `reset-password-page` son esqueletos        |
| UC-AUTH-04 | Cambiar contraseña                  | Fase 2    | No iniciado                                                                               |
| UC-AUTH-05 | Iniciar sesión con Google           | Fase 2    | No iniciado: el botón de `login-page` muestra un aviso ("próximamente")                   |
| UC-AUTH-06 | Autenticación biométrica            | Fase 3    | No iniciado                                                                               |
| UC-AUTH-07 | Registrarse (crear cuenta)          | MVP       | **Implementado** (`register-page`): crea la cuenta (con confirmación de email) sin taller |

El **registro** crea solo la cuenta. No da acceso: el `owner` debe agregar al usuario a su taller (UC-WS-03 y UC-WS-04, aún no implementados). Mientras tanto el login de una cuenta sin taller falla con `AuthorizationError` ("Tu usuario no pertenece a ningún taller activo").

## Estructura

```
features/auth/
├── pages/                    ← componentes enrutados
│   ├── login-page/           ← implementada
│   ├── register-page/        ← implementada
│   ├── forgot-password-page/ ← esqueleto
│   └── reset-password-page/  ← esqueleto
├── auth.routes.ts
└── README.md
```

No tiene `components/`: cada formulario vive dentro de su página porque no se reutiliza. Si una página crece o un formulario se necesita en otro sitio, se extrae a un componente presentacional (`input()`/`output()`, sin facades), según [D-FE-04](../../../../docs/architecture/frontend/decisions.md).

## Rutas

Cargadas con `loadChildren` bajo `/auth` (ver [`auth.routes.ts`](./auth.routes.ts)); son públicas, sin guard.

| Ruta                    | Página               | Estado       |
| ----------------------- | -------------------- | ------------ |
| `/auth/login`           | `LoginPage`          | Implementada |
| `/auth/register`        | `RegisterPage`       | Implementada |
| `/auth/forgot-password` | `ForgotPasswordPage` | Esqueleto    |
| `/auth/reset-password`  | `ResetPasswordPage`  | Esqueleto    |

`/auth` redirige a `/auth/login`. Las rutas protegidas (`/dashboard` y las que vengan) están bajo el shell con `authGuard`; sin sesión redirigen a `/auth/login?returnUrl=...`.

## Flujo de inicio de sesión

1. `LoginPage` valida el formulario (Reactive Forms) y llama a `AuthFacade.login()`.
2. `AuthEffects` consulta Supabase (`AuthService.login`), resuelve el usuario, su rol y su taller (`users` y `workshop_members`) y emite `loginSuccess` o `loginFailure`.
3. Si hay error, la página muestra un mensaje legible: credenciales incorrectas, usuario sin taller activo, o error genérico.
4. Con sesión activa (`isAuthenticated`), la página navega a `returnUrl` (solo rutas internas) o a `/dashboard`.

## Flujo de registro

1. `RegisterPage` valida nombre, email, contraseña (mínimo 6, igual que `minimum_password_length` de `supabase/config.toml`) y su confirmación, y llama a `AuthFacade.register()`. El email usa `emailValidator` (`@shared/utils`): el de Angular más un dominio con extensión (`ana@example` no pasa), y `trimOnChange` quita los espacios al escribir o pegar.
2. `AuthService.register` crea la cuenta en Supabase Auth con `full_name` en el metadata; el trigger `handle_new_auth_user` crea la fila de `users`. La confirmación de email está activada (`enable_confirmations = true`), así que no se abre sesión; si Supabase abriera una, se cierra.
3. Con éxito, la página dice que se envió un correo de confirmación. Con error, muestra un mensaje legible (email ya registrado, contraseña débil o genérico).
4. El usuario abre el enlace del correo y llega a `/auth/login?confirmed=1`, donde `LoginPage` avisa que el correo quedó confirmado. Supabase abre sesión desde ese enlace, pero la cuenta no tiene taller: `AuthService.restoreSession` la cierra.
5. Antes de confirmar, el login falla con "Confirma tu correo…" (`EmailNotConfirmedError`). Después de confirmar y sin taller, con "Tu usuario no pertenece a ningún taller activo".

**En local**, los correos no salen a Internet: llegan a Mailpit (<http://127.0.0.1:54324>). Si alguien se registra con un email que ya existe, Supabase responde como si hubiera funcionado (para no revelar qué correos tienen cuenta) y la página muestra el mismo aviso de confirmación.

## Dependencias

- `@core/auth`: `AuthFacade` (acciones y signals de la sesión).
- `@shared/components`: `Button`, `Card`, `Input`. `@shared/services`: `ToastService`.
- No importa de otras features.

## Pendiente

- Implementar `forgot-password-page` y `reset-password-page` (UC-AUTH-03). El servicio, las acciones y los effects ya existen en `core/auth`; falta la UI y los tests.
- Login con Google (UC-AUTH-05, Fase 2): el botón sigue mostrando "próximamente".
- Tras registrarse, el usuario no puede entrar hasta que el `owner` lo agregue a un taller: falta UC-WS-03/04 (invitar y aceptar).
- El enlace "¿Olvidaste tu contraseña?" de `login-page` apunta a una pantalla esqueleto ("works!").

## Tests

- `login-page.spec.ts`: navegación tras autenticar, `returnUrl` interno, mensaje de error y enlaces.
- `register-page.spec.ts`: validaciones (incluido el dominio del email y los espacios), envío, error, aviso de correo enviado y enlaces.
- `@shared/utils`: `email.validator.spec.ts` y `trim-on-change.spec.ts`.
- Los demás specs de la feature son de arranque ("should create").
- La lógica de sesión se prueba en `core/auth`: `auth.reducer.spec.ts` y las redirecciones de `auth.effects.spec.ts`. `auth.service.spec.ts` cubre `AuthService` (login, `restoreSession`, `roleIn`, registro, recuperación y cambio de contraseña, Google) con un cliente de Supabase falso. Los tests de integración de RLS están en `supabase/tests/`.
