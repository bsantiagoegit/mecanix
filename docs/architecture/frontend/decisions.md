# Decisiones Transversales — Frontend

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.2
- **Fecha:** Octubre 2026

---

## Propósito

Decisiones que aplican a **todo el frontend**. Se documentan aquí para no repetirlas en cada feature.

---

## D-FE-01: Arquitectura por features (feature-first)

Organizar el código por **feature de dominio**, no por tipo de archivo.

**Razón**: todo lo relacionado con "clientes" en un solo lugar. Agregar un feature es copiar la carpeta.

---

## D-FE-02: Tres capas de carpetas

`core/` (singleton), `shared/` (reutilizable), `features/` (negocio).

**Regla de dependencias**:

- `features/` importa de `core/` y `shared/`.
- `shared/` no importa de `features/` ni de `core/` (salvo utilidades puras).
- `core/` no importa de `features/`.
- Los `features/` no se importan entre sí.

---

## D-FE-03: Estructura estándar de un feature

Cada feature tiene: `components/`, `containers/`, `services/`, `models/`, `{feature}.routes.ts`, `README.md`. Opcionalmente `store/` y `guards/`.

**Razón**: predecible. El agente sabe dónde buscar cada tipo de archivo.

---

## D-FE-04: Componentes "dumb" vs "smart"

- **`components/`**: presentacionales. `input()`, `output()`. Sin lógica de negocio.
- **`containers/`**: smart. Inyectan servicios y store. Coordinan.

**Razón**: reduce acoplamiento. Los presentacionales son reutilizables y testeables.

---

## D-FE-05: Data services como capa de acceso a Supabase

Cada feature tiene un data service en `services/`. Los componentes **nunca** llaman a Supabase directamente.

**Razón**: los componentes no saben que existe Supabase. Cambiar de backend solo toca los data services.

---

## D-FE-06: `resource` para data fetching

Usar `resource` y `httpResource` (Angular 21) para consultas reactivas.

**Razón**: integra signals con async. Maneja loading, error, refresh. Reemplaza `subscribe` en `ngOnInit`.

---

## D-FE-07: Lazy loading por feature

Cada feature se carga con `loadChildren`.

**Razón**: bundle inicial pequeño. El usuario solo descarga lo que necesita.

---

## D-FE-08: `inject()` sobre constructor

Usar `inject()` de Angular.

**Razón**: más conciso. Funciona en funciones y campos. Estándar en Angular 21.

---

## D-FE-09: Guards funcionales

Usar `CanActivateFn` en lugar de clases.

**Razón**: menos boilerplate. Mejor tipado. Estándar en Angular 21.

---

## D-FE-10: Sin `resolvers` en MVP

Los contenedores cargan datos con `resource`. Sin resolvers.

**Razón**: los resolvers bloquean la navegación. Con `resource` la pantalla se muestra con skeleton.

---

## D-FE-11: Interceptors funcionales

Interceptors funcionales (`HttpInterceptorFn`) para lógica transversal HTTP.

**Nota**: como Supabase JS no usa `HttpClient`, los interceptors solo aplican a llamadas HTTP que no sean de Supabase.

---

## D-FE-12: Manejo de errores en tres niveles

- **Data service**: mapea errores de Supabase a errores de dominio.
- **Contenedor**: muestra al usuario, decide si reintentar.
- **Global**: `ErrorHandler` captura errores no manejados.

**Razón**: los componentes no manejan errores crudos de Supabase.

---

## D-FE-13: README por feature

Cada feature tiene un `README.md` con propósito, casos de uso, estructura, dependencias.

**Razón**: el agente de IA lo lee antes de tocar el feature.

---

## D-FE-14: Sin barrel files (excepto `core/`)

No usar `index.ts` para exportar en `shared/` ni en `features/`. Importar directamente desde el archivo.

**Razón**: los barrel files crean problemas de tree-shaking y ciclos.

**Excepción — `core/*`**: cada módulo de `core/` (`auth/`, `workshops/`, `catalogs/`, `theme/`, `supabase/`, `errors/`, `interceptors/`, `pwa/`, `network/`) sí tiene `index.ts`.

**Razón de la excepción**: son módulos singleton, transversales, con una API pública pequeña y estable (el store/facade, el servicio, los tipos). El barrel documenta esa API sin exponer los archivos internos (actions/reducer/effects/selectors). El riesgo de ciclos es bajo porque `core/` no importa de `features/` ni de `shared/` (D-FE-02).

---

## D-FE-15: Naming conventions

**Componentes**: el CLI de Angular 21 genera componentes sin sufijo `Component` en el archivo ni en la clase por defecto (`app.ts` → clase `App`, no `app.component.ts` → `AppComponent`). Se adopta ese default: `kebab-case.ts` para el archivo, `PascalCase` para la clase, sin sufijo. El resto de tipos (servicios, guards, stores, etc.) sí mantienen su sufijo porque no son componentes.

| Tipo                   | Convención                   | Ejemplo                         |
| ---------------------- | ---------------------------- | ------------------------------- |
| Archivos (componente)  | `kebab-case.ts`               | `customer-list.ts`              |
| Clases (componente)    | `PascalCase`                  | `CustomerList`                  |
| Archivos (resto)       | `kebab-case.tipo.ts`         | `customers.service.ts`          |
| Clases (resto)         | `PascalCase`                 | `CustomersService`              |
| Métodos/variables | `camelCase`                  | `loadCustomers()`               |
| Constantes        | `UPPER_SNAKE_CASE`           | `MAX_PHOTOS_PER_ORDER`          |
| Interfaces        | `PascalCase` sin prefijo `I` | `Customer`, `CreateCustomerDto` |
| Signals           | `camelCase`                  | `customers = signal([])`        |
| Stores NgRx       | `feature.store.ts`           | `auth.store.ts`                 |
| Effects NgRx      | `feature.effects.ts`         | `auth.effects.ts`               |
| Guards            | `feature.guard.ts`           | `auth.guard.ts`                 |
| Rutas             | `feature.routes.ts`          | `customers.routes.ts`           |

---

## D-FE-16: Standalone components

Todos los componentes, directivas y pipes son **standalone**. No se usan `NgModule` en el proyecto.

**Razón**: Angular 21 tiene standalone por defecto. Menos boilerplate, mejor tree-shaking, más explícito sobre dependencias. Heredado de [ADR-001](../adr/ADR-001-angular-21.md).

**Implicación**: cada componente declara sus dependencias en el array `imports` del decorador.

---

## D-FE-17: Zoneless change detection

La aplicación corre **sin zone.js**. La detección de cambios se basa en signals.

**Razón**: Angular 21 activa zoneless por defecto. Mejor performance, menos magia, bundles más pequeños. Heredado de [ADR-001](../adr/ADR-001-angular-21.md).

**Implicación**:

- Los componentes deben usar signals para que la UI se actualice.
- No se puede depender de `setTimeout` o `Promise` para disparar detección de cambios.
- `ChangeDetectorRef` no es necesario.

---

## D-FE-18: Nomenclatura en inglés, documentación en español

El **código** (nombres de archivos, carpetas, clases, variables) va en **inglés**. La **documentación de dominio** (`docs/domain/`) va en **español**. La **documentación de arquitectura** (`docs/architecture/`) también va en español.

**Razón**:

- El código en inglés es el estándar de la industria.
- La documentación de dominio en español refleja el idioma del negocio (taller ecuatoriano).
- La separación es intencional: el desarrollador lee código en inglés, el dueño del taller lee documentación en español.

**Ejemplo**:

- Carpeta: `features/work-orders/` (inglés).
- Documento de dominio: `docs/domain/use-cases/05-ordenes-trabajo.md` (español).
- Caso de uso: `UC-WO-01` (prefijo en inglés, documentación en español).

---

## Resumen

| ID      | Decisión                                        |
| ------- | ----------------------------------------------- |
| D-FE-01 | Arquitectura por features                       |
| D-FE-02 | Tres capas: core, shared, features              |
| D-FE-03 | Estructura estándar de un feature               |
| D-FE-04 | Componentes dumb vs smart                       |
| D-FE-05 | Data services para Supabase                     |
| D-FE-06 | `resource` para data fetching                   |
| D-FE-07 | Lazy loading por feature                        |
| D-FE-08 | `inject()` sobre constructor                    |
| D-FE-09 | Guards funcionales                              |
| D-FE-10 | Sin resolvers en MVP                            |
| D-FE-11 | Interceptors funcionales                        |
| D-FE-12 | Manejo de errores en tres niveles               |
| D-FE-13 | README por feature                              |
| D-FE-14 | Sin barrel files                                |
| D-FE-15 | Naming conventions                              |
| D-FE-16 | Standalone components                           |
| D-FE-17 | Zoneless change detection                       |
| D-FE-18 | Nomenclatura: código en inglés, docs en español |

---

## Referencias

- [README de frontend](./README.md)
- [Estructura](./structure.md)
- [Plantilla de feature](./feature-template.md)

---

_Decisiones Transversales — Frontend v1.2_
