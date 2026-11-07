# Estructura de Carpetas

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.4
- **Fecha:** Octubre 2026

---

## Propósito

Definir la estructura completa del frontend Angular, con las tres capas (`core/`, `shared/`, `features/`) y sus reglas de dependencia.

---

## Estructura completa

```
src/
├── app/
│   ├── core/                          ← singletons: módulos de dominio transversales e infraestructura
│   │   ├── auth/                      ← sesión (store/, service, guard, modelos)
│   │   ├── workshops/                 ← taller activo (store/, service, modelos)
│   │   ├── catalogs/                  ← catálogos globales (store/, service, modelos)
│   │   ├── store/                     ← composición del store global (AppState, persistencia)
│   │   ├── theme/                     ← tema claro/oscuro/sistema
│   │   ├── supabase/
│   │   ├── errors/
│   │   ├── interceptors/
│   │   ├── pwa/                       ← update/install (service worker)
│   │   ├── network/                   ← estado online/offline
│   │   └── config/
│   │
│   ├── shared/                        ← UI reutilizable sin lógica de negocio ni dependencia de core/
│   │   ├── components/
│   │   ├── directives/
│   │   ├── pipes/
│   │   ├── services/                  ← servicios de UI sin dominio (ToastService)
│   │   ├── models/                    ← tipos de UI (ToastMessage)
│   │   └── utils/                     ← funciones puras (cn)
│   │
│   ├── layout/                        ← shell principal de la app (compone core/ y shared/)
│   │
│   ├── features/                      ← features del dominio
│   │   ├── auth/
│   │   ├── workshops/
│   │   ├── customers/
│   │   ├── vehicles/
│   │   ├── work-orders/
│   │   ├── inspections/
│   │   ├── diagnoses/
│   │   ├── repairs/
│   │   ├── items/
│   │   ├── quotes/
│   │   ├── warranties/
│   │   ├── photos/
│   │   ├── pdfs/
│   │   ├── reports/
│   │   └── saas-admin/
│   │
│   ├── app.ts
│   ├── app.config.ts
│   └── app.routes.ts
│
├── environments/
│   ├── environment.ts
│   └── environment.prod.ts
│
└── styles.css
```

---

## `core/`

**Propósito**: servicios singleton que se usan en toda la app.

**Regla**: no importa de `features/` ni de `shared/` (salvo utilidades puras). Organización según [D-FE-19](./decisions.md).

**Módulos de dominio** (cada uno con su `store/` NgRx, ver "Anatomía de un módulo de `core/`"):

| Carpeta      | Propósito                                                            |
| ------------ | -------------------------------------------------------------------- |
| `auth/`      | Sesión: store, guard, service de Supabase Auth, tipos de usuario/rol |
| `workshops/` | Taller activo y talleres disponibles: store, service, tipos          |
| `catalogs/`  | Catálogos globales (roles, estados de orden, tipos de item): store   |

**Infraestructura** (una carpeta por capacidad):

| Carpeta         | Propósito                                                                   |
| --------------- | --------------------------------------------------------------------------- |
| `store/`        | Composición del store global: `AppState` y meta-reducer de persistencia     |
| `theme/`        | Servicio de tema (claro/oscuro/sistema)                                     |
| `supabase/`     | Singleton del cliente Supabase                                              |
| `errors/`       | Errores de dominio (`DataError`, `NotFoundError`, `ValidationError`, ...) y `mapSupabaseError` |
| `interceptors/` | Interceptors HTTP funcionales (vacía mientras no se use `HttpClient`)       |
| `pwa/`          | `UpdateService` (SwUpdate) e `InstallService` (beforeinstallprompt)         |
| `network/`      | `NetworkService`: signal online/offline para el banner offline              |
| `config/`       | Constantes y configuración global de la app                                 |

**Caso especial**: `auth` y `workshops` tienen parte en `core/` (estado global) y parte en `features/` (pantallas). Ver "Casos especiales".

---

## `layout/`

**Propósito**: el shell principal de la app (header, `router-outlet`, contenedor de toasts). Es la ruta padre de las features autenticadas.

**Regla**: es una capa de composición; puede importar de `core/` (sesión, taller activo) y de `shared/` (UI). `core/` y `shared/` no lo importan.

---

## `shared/`

**Propósito**: componentes, pipes, directivas y utilidades de UI reutilizables, **sin lógica de negocio**.

**Regla**: no importa de `features/` ni de `core/` (salvo utilidades puras como funciones de formato). Si algo necesita la sesión o el taller activo (por ejemplo el shell de la app o una directiva `hasRole`), no es `shared/`: va en `layout/` (si compone la UI de la app) o en `core/` (si es un servicio).

**Contenido**:

| Carpeta       | Propósito                                                   |
| ------------- | ----------------------------------------------------------- |
| `components/` | Botones, inputs, modales, skeletons, estados vacíos, toasts |
| `pipes/`      | Formateo de moneda, fecha, etc.                             |
| `directives/` | Directivas visuales reutilizables                           |
| `services/`   | Servicios de UI sin dominio (`ToastService`)                |
| `models/`     | Tipos de UI (`ToastMessage`)                                |
| `utils/`      | Funciones puras (`cn`)                                      |

**Ejemplos de componentes**:

- `button/`
- `input/`
- `modal/`
- `skeleton/`
- `empty-state/`
- `error-state/`
- `toast/`

---

## `features/`

**Propósito**: features del dominio. Cada uno es autocontenido.

**Regla**: no se importan entre sí. Si dos features necesitan compartir lógica, va en `shared/` o `core/`.

**Features**:

| Feature       | Casos de uso     | Prioridad |
| ------------- | ---------------- | --------- |
| `auth`        | UC-AUTH-01 a 06  | MVP       |
| `workshops`   | UC-WS-01 a 08    | MVP       |
| `customers`   | UC-CUST-01 a 07  | MVP       |
| `vehicles`    | UC-VEH-01 a 07   | MVP       |
| `work-orders` | UC-WO-01 a 14    | MVP       |
| `inspections` | UC-INSP-01 a 06  | MVP       |
| `diagnoses`   | UC-DIAG-01 a 04  | MVP       |
| `repairs`     | UC-REP-01 a 11   | MVP       |
| `items`       | UC-PART-01 a 06  | MVP       |
| `quotes`      | UC-QUOTE-01 a 07 | MVP       |
| `warranties`  | UC-WAR-01 a 04   | MVP       |
| `photos`      | UC-PHOTO-01 a 06 | MVP       |
| `pdfs`        | UC-PDF-01 a 06   | MVP       |
| `reports`     | UC-RPT-01 a 07   | MVP       |
| `saas-admin`  | UC-SAAS-01 a 07  | MVP       |

---

## Reglas de dependencia

```
features/ ──→ shared/  (permitido)
features/ ──→ core/    (permitido)
features/ ──→ features/ (PROHIBIDO)
shared/   ──→ core/    (PROHIBIDO, salvo utilidades puras)
core/     ──→ features/ (PROHIBIDO)
shared/   ──→ shared/  (permitido)
core/     ──→ core/    (permitido)
```

**Razón**:

- `features/` → `features/` crea acoplamiento y ciclos.
- `shared/` → `core/` crea dependencia de UI a infraestructura.
- `core/` → `features/` invierte la jerarquía.

**Excepción**: `shared/` puede importar utilidades puras de `core/utils/` (funciones sin estado, sin dependencias).

---

## Anatomía de un módulo de `core/`

Los archivos del store NgRx se agrupan en `store/`; el servicio, el guard y los tipos de dominio van planos junto a ella ([D-FE-19](./decisions.md)):

```
core/auth/
├── store/
│   ├── auth.actions.ts
│   ├── auth.state.ts          ← AuthState + estado inicial
│   ├── auth.reducer.ts
│   ├── auth.selectors.ts
│   ├── auth.effects.ts
│   └── auth.facade.ts         ← API que usan los componentes (signals vía selectSignal)
├── auth.service.ts            ← acceso a Supabase Auth
├── auth.guard.ts
├── auth.model.ts              ← User, Role, AuthSession
└── index.ts                   ← API pública del módulo
```

**`index.ts` exporta**: la facade, el servicio, el guard, los tipos de dominio y las actions/selectors que otros módulos de `core/` necesiten (p. ej. `workshops` reacciona a `AuthActions.loginSuccess`). No exporta reducers ni effects (los registra `app.config.ts` importándolos de `store/`).

**Imports**: dentro del módulo, rutas relativas (`./store/auth.actions`). Nunca importar el módulo por su propio `index.ts`, porque crea ciclos. Desde fuera: `import { AuthFacade } from '@core/auth'`.

---

## Casos especiales: `auth`, `workshops` y `catalogs`

Estos tres slices del store global son **transversales** (toda la app los usa) y merecen documentación específica.

**Decisión**: la sesión es global, las pantallas son una feature. La separación refleja la diferencia.

```
core/auth/                    ← estado global de sesión (ver anatomía arriba)

features/auth/                ← pantallas de login, registro, recuperación
├── pages/
├── components/
├── auth.routes.ts
└── README.md
```

**Mismo patrón para `workshops`**:

```
core/workshops/               ← taller activo (estado global)
├── store/                    ← actions, state, reducer, selectors, effects, facade
├── workshop.service.ts
├── workshop.model.ts
└── index.ts

features/workshops/           ← pantallas de gestión del taller
├── pages/
├── components/
├── workshops.routes.ts
└── README.md
```

**Caso especial: `catalogs`**

Los catálogos globales (roles, estados de orden, tipos de item) no tienen pantallas. Son datos de referencia que la app carga una vez y comparte.

```
core/catalogs/                ← catálogos globales (estado global)
├── store/
├── catalogs.service.ts
├── catalogs.model.ts
└── index.ts
```

**Razón**: los catálogos son inmutables y se usan en múltiples features (ej: `work-orders` usa estados, `items` usa tipos). Cargarlos una vez es más eficiente que cada feature los recargue.

**Catálogos incluidos**:

- `roles`: owner, advisor, mechanic.
- `order-statuses`: draft, received, inspecting, etc.
- `item-types`: part, supply.
- `approval-channels`: in_person, phone, whatsapp, email.
- `repair-statuses`: recommended, approved, rejected, cancelled.

**Caso especial: `theme`**

El tema no es un slice de NgRx. Vive como un servicio con signal.

```
core/theme/
├── theme.service.ts ← signal + setTheme() + effect()
└── theme.model.ts   ← tipo Theme = 'light' | 'dark' | 'system'
```

**Razón**: el tema es un solo valor (string). No justifica NgRx. Un servicio con signal es suficiente.

**Persistencia**: `localStorage` con clave `theme`.

---

## Alias de importación

`@core/*`, `@shared/*` y `@features/*`, definidos en `tsconfig.json` ([D-FE-20](./decisions.md)). Alias al cruzar capas o módulos; rutas relativas dentro del mismo módulo o feature.

---

## Referencias

- [README de frontend](./README.md)
- [Decisiones transversales](./decisions.md)
- [Plantilla de feature](./feature-template.md)

---

_Estructura de Carpetas v1.4_
