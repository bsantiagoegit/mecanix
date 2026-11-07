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

Fuera de los casos de uso documentados: el **registro** (`register-page`). No existe un UC de registro y, según [UC-WS-01 y UC-WS-04](../../../../docs/domain/use-cases/02-onboarding-taller.md), los talleres los crea el administrador del SaaS y los usuarios entran por invitación. Un usuario registrado por su cuenta no tendría taller y su login fallaría con `AuthorizationError`.

## Estructura

```
features/auth/
├── components/               ← presentacionales
│   ├── login-form/           ← esqueleto vacío (el formulario vive hoy en login-page)
│   ├── register-form/        ← esqueleto vacío
│   ├── forgot-password-form/ ← esqueleto vacío
│   └── reset-password-form/  ← esqueleto vacío
├── pages/                    ← componentes enrutados
│   ├── login-page/           ← implementada
│   ├── register-page/        ← esqueleto ("register-page works!")
│   ├── forgot-password-page/ ← esqueleto
│   └── reset-password-page/  ← esqueleto
├── auth.routes.ts
└── README.md
```

## Rutas

Cargadas con `loadChildren` bajo `/auth` (ver [`auth.routes.ts`](./auth.routes.ts)); son públicas, sin guard.

| Ruta                    | Página               | Estado       |
| ----------------------- | -------------------- | ------------ |
| `/auth/login`           | `LoginPage`          | Implementada |
| `/auth/register`        | `RegisterPage`       | Esqueleto    |
| `/auth/forgot-password` | `ForgotPasswordPage` | Esqueleto    |
| `/auth/reset-password`  | `ResetPasswordPage`  | Esqueleto    |

`/auth` redirige a `/auth/login`. Las rutas protegidas (`/dashboard` y las que vengan) están bajo el shell con `authGuard`; sin sesión redirigen a `/auth/login?returnUrl=...`.

## Flujo de inicio de sesión

1. `LoginPage` valida el formulario (Reactive Forms) y llama a `AuthFacade.login()`.
2. `AuthEffects` consulta Supabase (`AuthService.login`), resuelve el usuario, su rol y su taller (`users` y `workshop_members`) y emite `loginSuccess` o `loginFailure`.
3. Si hay error, la página muestra un mensaje legible: credenciales incorrectas, usuario sin taller activo, o error genérico.
4. Con sesión activa (`isAuthenticated`), la página navega a `returnUrl` (solo rutas internas) o a `/dashboard`.

## Dependencias

- `@core/auth`: `AuthFacade` (acciones y signals de la sesión).
- `@shared/components`: `Button`, `Card`, `Input`. `@shared/services`: `ToastService`.
- No importa de otras features.

## Pendiente

- Implementar `forgot-password-page` y `reset-password-page` (UC-AUTH-03). El servicio, las acciones y los effects ya existen en `core/auth`; falta la UI y los tests.
- Decidir qué hacer con `register-page` y el login con Google, que no son MVP.
- Eliminar o implementar los cuatro `*-form` vacíos. `login-form` está duplicado por el formulario de `login-page`.
- Los enlaces de `login-page` apuntan a pantallas esqueleto: hasta implementarlas, un usuario real llega a "works!".

## Tests

- `login-page.spec.ts`: navegación tras autenticar, `returnUrl` interno, mensaje de error y enlaces.
- Los demás specs de la feature son de arranque ("should create").
- La lógica de sesión se prueba en `core/auth`: `auth.reducer.spec.ts` y las redirecciones de `auth.effects.spec.ts`. `auth.service.spec.ts` cubre `AuthService` (login, `restoreSession`, `roleIn`, registro, recuperación y cambio de contraseña, Google) con un cliente de Supabase falso. Los tests de integración de RLS están en `supabase/tests/`.
