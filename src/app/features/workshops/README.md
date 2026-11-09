# Feature `workshops`

Todo lo relativo al taller: crearlo, configurarlo y gestionar su equipo. Hoy están el **onboarding** (crear el propio taller) y la **configuración** del taller (solo `owner`). La lectura de los talleres del usuario y el taller activo viven en [`core/workshops/`](../../core/workshops/).

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
│   ├── create-workshop-page/     ← onboarding: nombre, dirección y teléfono
│   └── workshop-settings-page/   ← configuración del taller (owner)
├── services/
│   ├── workshop-logo.service.ts      ← sube y elimina el logo en el bucket `logos`
│   └── workshop-settings.service.ts  ← guarda datos + logo de forma ordenada
├── onboarding.routes.ts
├── workshops.routes.ts
└── README.md
```

## Rutas

| Ruta                          | Página                 | Protección                                                            |
| ----------------------------- | ---------------------- | --------------------------------------------------------------------- |
| `/onboarding/create-workshop` | `CreateWorkshopPage`   | `onboardingGuard`: sin sesión va al login; con taller vuelve a la app |
| `/settings`                   | `WorkshopSettingsPage` | `roleGuard('owner')` bajo el shell: otro rol vuelve a `/dashboard`    |

Ver [`app.routes.ts`](../../app.routes.ts). El enlace "Configuración" del encabezado solo lo ve el `owner`; la autoridad real es la RLS (`workshops_update_owner`), no la interfaz.

## Flujo de creación

1. `CreateWorkshopPage` valida nombre, dirección y teléfono (`trimOnChange` quita los espacios sobrantes).
2. Llama a `WorkshopService.create`, que invoca la función SQL `create_workshop` (crea el taller y la membresía `owner` en una sola transacción).
3. Con éxito, `AuthFacade.restoreSession()` vuelve a resolver la sesión (ahora con taller) y la página navega a `/dashboard`.
4. Si falla, muestra el motivo (`WorkshopCreationError`): correo sin confirmar, datos inválidos, sesión expirada o "ya tienes taller" (en ese caso sincroniza la sesión).

El estado de envío y el error son locales a la página (signals); no hay slice de NgRx porque no es estado global.

## Flujo de configuración (UC-WS-02)

`WorkshopSettingsPage` carga el taller activo en el formulario y permite editar:

- **Datos**: nombre, dirección, teléfono y **logo** (subir, cambiar o quitar, con vista previa).
- **Reglas**: capacidad, fotos mínimas de ingreso, días de validez de la cotización, días de garantía, moneda (3 letras mayúsculas) y zona horaria (se valida con `Intl`).

Al guardar, `WorkshopSettingsService.save` hace, en este orden ([ADR-014](../../../../docs/architecture/adr/ADR-014-bucket-publico-logos.md)):

1. Si hay un logo nuevo: `WorkshopLogoService.upload` lo valida (JPG/PNG/WebP, hasta 5 MB), lo redimensiona a un máximo de 512 px con canvas y lo sube a `logos/{workshop_id}/{uuid}.{ext}`.
2. `WorkshopService.update` guarda los datos y la URL pública en `workshops.logo_url`.
3. Si el guardado tuvo éxito, elimina el archivo del logo anterior (mejor esfuerzo: si falla queda un huérfano, pero no rompe el guardado).
4. Si el guardado **falla** después de subir, elimina el logo recién subido y se conserva el anterior.

La página actualiza el store (`WorkshopFacade.applyUpdate`), así el nombre del encabezado cambia al instante, y confirma con un toast.

## Dependencias

- `@core/auth`: `AuthFacade`. `@core/workshops`: `WorkshopService`, `WorkshopFacade`. `@core/errors`: `WorkshopCreationError`, `AuthorizationError`.
- `@shared/components`: `Button`, `Card`, `Input`. `@shared/services`: `ToastService`. `@shared/utils`: `trimOnChange`, `resizeImage`.
- No importa de otras features.

## Pendiente

- Logo opcional al crear el taller (UC-WS-08) y logo en el encabezado: siguiente PR.
- Equipo e invitaciones (UC-WS-03/04/05).
- El logo anterior se elimina desde el cliente; la limpieza de huérfanos queda para Fase 2 (D-ST-10).

## Tests

- `create-workshop-page.spec.ts`: validaciones, creación, estados de carga y error, sincronización de la sesión y navegación.
- `workshop-settings-page.spec.ts`: carga del formulario, validaciones, guardado, logo (vista previa, quitar, inválido) y mensajes de error.
- `workshop-logo.service.spec.ts` y `workshop-settings.service.spec.ts`: validación, ruta y URL del archivo, borrado de mejor esfuerzo y limpieza si falla el guardado.
- `core/workshops`: `workshop.service.spec.ts` (`create` y `update`) y `workshop.reducer.spec.ts`.
- `layout/shell.spec.ts`: el enlace de configuración solo para el `owner`; `core/auth/auth.guard.spec.ts` incluye `roleGuard`.
- Las reglas de la función (un taller por cuenta, `owner`, correo confirmado) las prueban los tests de integración de `supabase/tests/rls/workshop-onboarding.spec.ts`.
