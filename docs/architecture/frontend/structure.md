# Estructura de Carpetas

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.2
- **Fecha:** Octubre 2026

---

## Propósito

Definir la estructura completa del frontend Angular, con las tres capas (`core/`, `shared/`, `features/`) y sus reglas de dependencia.

---

## Estructura completa

```
src/
├── app/
│   ├── core/                          ← servicios singleton, guards, interceptors
│   │   ├── auth/
│   │   ├── workshops/
│   │   ├── catalogs/                  ← catálogos globales (roles, estados, tipos)
│   │   ├── theme/                     ← tema claro/oscuro/sistema
│   │   ├── supabase/
│   │   ├── errors/
│   │   ├── interceptors/
│   │   └── config/
│   │
│   ├── shared/                        ← componentes reutilizables sin lógica de negocio
│   │   ├── components/
│   │   ├── pipes/
│   │   └── directives/
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
│   ├── app.component.ts
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

**Regla**: no importa de `features/`.

**Contenido**:

| Carpeta         | Propósito                                                                   |
| --------------- | --------------------------------------------------------------------------- |
| `auth/`         | Store de sesión, guard, service de Supabase Auth                            |
| `workshops/`    | Store del taller activo, service de talleres                                |
| `catalogs/`     | Store de catálogos globales (roles, estados de orden, tipos de item)        |
| `theme/`        | Servicio de tema (claro/oscuro/sistema)                                     |
| `supabase/`     | Singleton del cliente Supabase                                              |
| `errors/`       | Tipos de error de dominio (`DataError`, `NotFoundError`, `ValidationError`) |
| `interceptors/` | Interceptors HTTP funcionales                                               |
| `config/`       | Configuración global de la app                                              |

**Caso especial**: `auth` y `workshops` tienen parte en `core/` (estado global) y parte en `features/` (pantallas). Ver sección "Casos especiales".

---

## `shared/`

**Propósito**: componentes, pipes y directivas reutilizables, **sin lógica de negocio**.

**Regla**: no importa de `features/` ni de `core/` (salvo utilidades puras como funciones de formato).

**Contenido**:

| Carpeta       | Propósito                                                   |
| ------------- | ----------------------------------------------------------- |
| `components/` | Botones, inputs, modales, skeletons, estados vacíos, toasts |
| `pipes/`      | Formateo de moneda, fecha, etc.                             |
| `directives/` | Directivas reutilizables (`hasRole`, etc.)                  |

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

## Casos especiales: `auth`, `workshops` y `catalogs`

Estos tres slices del store global son **transversales** (toda la app los usa) y merecen documentación específica.

**Decisión**:

```
core/auth/                    ← estado global de sesión
├── auth.store.ts
├── auth.effects.ts
├── auth.guard.ts
└── auth.service.ts

features/auth/                ← pantallas de login
├── containers/
├── components/
├── auth.routes.ts
└── README.md
```

**Razón**: la sesión es global, las pantallas son un feature. La separación refleja la diferencia.

**Mismo patrón para `workshops`**:

```
core/workshops/               ← taller activo (estado global)
├── workshop.store.ts
└── workshop.service.ts

features/workshops/           ← pantallas de gestión del taller
├── containers/
├── components/
├── workshops.routes.ts
└── README.md
```

**Caso especial: `catalogs`**

Los catálogos globales (roles, estados de orden, tipos de item) no tienen pantallas. Son datos de referencia que la app carga una vez y comparte.

```
core/catalogs/               ← catálogos globales (estado global)
├── catalogs.store.ts
├── catalogs.effects.ts
├── catalogs.service.ts
└── catalogs.model.ts
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
└── theme.model.ts ← tipo Theme = 'light' | 'dark' | 'system'
```

**Razón**: el tema es un solo valor (string). No justifica NgRx. Un servicio con signal es suficiente.

**Persistencia**: `localStorage` con clave `theme`.

---

## Referencias

- [README de frontend](./README.md)
- [Decisiones transversales](./decisions.md)
- [Plantilla de feature](./feature-template.md)

---

_Estructura de Carpetas v1.2_
