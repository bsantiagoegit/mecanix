# Feature `dashboard`

Página de inicio de la app autenticada: lo primero que ve el usuario tras iniciar sesión. Hoy es un **marcador de posición**: no muestra datos reales.

## Casos de uso

| ID        | Caso de uso                                               | Prioridad | Estado                                                                                |
| --------- | --------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------- |
| UC-RPT-01 | Ver dashboard de órdenes (abiertas, cerradas, por estado) | MVP       | **Pendiente**: las tarjetas muestran "—". Los datos llegarán con la feature `reports` |

Definido en [`docs/domain/use-cases/14-reportes.md`](../../../../docs/domain/use-cases/14-reportes.md). Es una vista para el **owner**; hoy cualquier rol activo ve la misma página.

## Estructura

```
features/dashboard/
├── pages/
│   └── dashboard-page/   ← título, nombre del taller activo y tres tarjetas vacías
├── dashboard.routes.ts
└── README.md
```

No tiene `components/`, `services/` ni `models/`: todavía no hay lógica propia. Aparece en [`structure.md`](../../../../docs/architecture/frontend/structure.md) junto a `reports`.

## Rutas

| Ruta         | Página          | Protección                                                                                                                        |
| ------------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard` | `DashboardPage` | Hereda `workshopGuard` del shell (sesión y taller) (ver [`app.routes.ts`](../../app.routes.ts)). Es el destino por defecto de `/` |

## Dependencias

- `@core/workshops`: `WorkshopFacade` (nombre del taller activo).
- `@shared/components`: `Card`.
- No importa de otras features.

## Pendiente

- Cuando exista la feature `reports`, esta página consumirá sus datos (órdenes abiertas, vehículos en taller, ingresos del mes). Hasta entonces las tarjetas siguen en "—".
- Decidir si el dashboard muestra contenido distinto por rol: UC-RPT-01 es solo para el owner, y un mecánico o asesor hoy ve igualmente las métricas vacías.

## Tests

- `dashboard-page.spec.ts`: prueba de arranque ("should create") con el store de pruebas.
