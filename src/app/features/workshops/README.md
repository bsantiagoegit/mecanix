# Feature `workshops`

Todo lo relativo al taller: crearlo, configurarlo y gestionar su equipo. Hoy solo está el **onboarding** (crear el propio taller). La lectura de los talleres del usuario y el taller activo viven en [`core/workshops/`](../../core/workshops/).

## Casos de uso

Definidos en [`docs/domain/use-cases/02-onboarding-taller.md`](../../../../docs/domain/use-cases/02-onboarding-taller.md).

| ID       | Caso de uso                      | Prioridad | Estado                                    |
| -------- | -------------------------------- | --------- | ----------------------------------------- |
| UC-WS-08 | Crear mi propio taller           | MVP       | **Implementado** (`create-workshop-page`) |
| UC-WS-02 | Configurar taller                | MVP       | Pendiente                                 |
| UC-WS-03 | Invitar usuario a taller         | MVP       | Pendiente (Edge Function `invite-user`)   |
| UC-WS-04 | Aceptar invitación               | MVP       | Pendiente                                 |
| UC-WS-05 | Asignar o cambiar el rol         | MVP       | Pendiente                                 |
| UC-WS-01 | Crear taller manualmente (admin) | Fase 2    | No iniciado                               |
| UC-WS-06 | Desactivar usuario de taller     | Fase 2    | No iniciado                               |
| UC-WS-07 | Reactivar usuario de taller      | Fase 2    | No iniciado                               |

Decisiones: [ADR-012](../../../../docs/architecture/adr/ADR-012-onboarding-self-service.md) y [ADR-013](../../../../docs/architecture/adr/ADR-013-invitaciones-edge-function.md). Flujos y contratos en [`workshop-onboarding.md`](../../../../docs/architecture/multi-tenant/workshop-onboarding.md).

## Estructura

```
features/workshops/
├── pages/
│   └── create-workshop-page/   ← formulario de nombre, dirección y teléfono
├── onboarding.routes.ts
└── README.md
```

## Rutas

Bajo `/onboarding`, con `onboardingGuard` (sesión sin taller). Ver [`app.routes.ts`](../../app.routes.ts).

| Ruta                          | Página               | Protección                                                            |
| ----------------------------- | -------------------- | --------------------------------------------------------------------- |
| `/onboarding/create-workshop` | `CreateWorkshopPage` | `onboardingGuard`: sin sesión va al login; con taller vuelve a la app |

## Flujo de creación

1. `CreateWorkshopPage` valida nombre, dirección y teléfono (`trimOnChange` quita los espacios sobrantes).
2. Llama a `WorkshopService.create`, que invoca la función SQL `create_workshop` (crea el taller y la membresía `owner` en una sola transacción).
3. Con éxito, `AuthFacade.restoreSession()` vuelve a resolver la sesión (ahora con taller) y la página navega a `/dashboard`.
4. Si falla, muestra el motivo (`WorkshopCreationError`): correo sin confirmar, datos inválidos, sesión expirada o "ya tienes taller" (en ese caso sincroniza la sesión).

El estado de envío y el error son locales a la página (signals); no hay slice de NgRx porque no es estado global.

## Dependencias

- `@core/auth`: `AuthFacade`. `@core/workshops`: `WorkshopService`. `@core/errors`: `WorkshopCreationError`.
- `@shared/components`: `Button`, `Card`, `Input`. `@shared/utils`: `trimOnChange`.
- No importa de otras features.

## Pendiente

- Configurar el taller (UC-WS-02), equipo e invitaciones (UC-WS-03/04/05).

## Tests

- `create-workshop-page.spec.ts`: validaciones, creación, estados de carga y error, sincronización de la sesión y navegación.
- `core/workshops/workshop.service.spec.ts`: la llamada a `create_workshop` y el mapeo de errores.
- Las reglas de la función (un taller por cuenta, `owner`, correo confirmado) las prueban los tests de integración de `supabase/tests/rls/workshop-onboarding.spec.ts`.
