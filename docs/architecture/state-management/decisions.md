# Decisiones Transversales — Estado

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Decisiones que aplican a **todo el manejo de estado**. Se documentan aquí para no repetirlas en cada archivo.

---

## D-STATE-01: Signals como default

Usar **signals** como mecanismo por defecto para todo estado que no sea server state ni global.

**Cuándo NO usar signals**: server state (usar `resource`), estado global compartido (usar NgRx), estado de formulario (usar Reactive Forms).

---

## D-STATE-02: `resource` para todo server state

Todas las consultas a Supabase que devuelven datos para mostrar usan `resource`.

**Cuándo NO usar `resource`**: escrituras (INSERT, UPDATE, DELETE), operaciones transaccionales complejas (RPC), uploads de archivos.

---

## D-STATE-03: NgRx solo para 3 slices

NgRx se usa **solo** para `auth`, `workshops`, `catalogs`.

**Cuándo NO usar NgRx**: server state, estado local de un feature, estado de un componente, estado de formulario, estado derivado.

---

## D-STATE-04: Servicios con signals para estado de feature

Cuando un estado es específico de un feature pero se comparte entre múltiples componentes del mismo feature, se usa un servicio del feature con signals.

**Ubicación**: `features/{feature}/services/{feature}-state.service.ts`.

---

## D-STATE-05: Signals locales para estado de componente

El estado efímero de un componente vive en signals locales. No se promueve a servicio ni a store.

**Ejemplos**: modal abierto/cerrado, tab activa, dropdown abierto, input focus, índice de paginación.

---

## D-STATE-06: Reactive Forms para form state

Los formularios usan Reactive Forms. No se sincronizan con signals.

**Excepción**: si el formulario necesita exponer un valor derivado a la UI, se puede usar `toSignal(form.valueChanges)`.

---

## D-STATE-07: `computed()` para estado derivado

Todo estado derivado se calcula con `computed()`. Nunca con `effect()`.

**Razón**: `computed()` es lazy y sin side effects. `effect()` es eager y está diseñado para sincronización externa.

---

## D-STATE-08: `effect()` solo para sincronización externa

`effect()` se usa **solo** para sincronizar con APIs externas no reactivas: `localStorage`, `document.title`, logging, librerías no reactivas.

**Cuándo NO usar `effect()`**: derivar estado, llamar a servicios, reaccionar a cambios de input.

---

## D-STATE-09: `localStorage` para borradores de formularios

Los formularios largos persisten un borrador en `localStorage` cada N segundos. Al recargar, se ofrece restaurar.

**Qué NO se persiste**: archivos (van a Storage), datos sensibles.

---

## D-STATE-10: Sin NgRx Effects para data fetching

NgRx Effects se usan **solo** para lógica asíncrona del store global (`auth`, `workshops`, `catalogs`). **No** para data fetching de features.

**Razón**: el data fetching de features se maneja con `resource` en los contenedores.

---

## D-STATE-11: Estado de sesión en NgRx

`auth` vive en NgRx porque es global, tiene lógica asíncrona, persiste entre rutas, y tiene múltiples consumidores.

**Estado**: `user`, `workshopIds`, `activeWorkshopId`, `role`, `isAuthenticated`, `isLoading`, `error`.

---

## D-STATE-12: Estado de taller activo en NgRx

`workshops` vive en NgRx porque es global, el taller activo determina qué datos se cargan, y tiene lógica asíncrona.

**Estado**: `available`, `active`, `isLoading`, `error`.

---

## D-STATE-13: Catálogos en NgRx

`catalogs` vive en NgRx porque son globales, inmutables, y se cargan una vez al iniciar la app.

**Estado**: `roles`, `orderStatuses`, `itemTypes`, `approvalChannels`, `repairStatuses`, `isLoading`, `error`.

---

## D-STATE-14: Persistencia de NgRx con `localStorage`

Los slices `auth` y `workshops` se persisten parcialmente. Los catálogos también.

**Qué se persiste**:

- `auth`: `user`, `activeWorkshopId`, `role`.
- `workshops`: `active`.
- `catalogs`: todo.

**Implementación**: meta-reducer custom. Sin dependencias extra.

**Adicional**: el **tema** (`light` / `dark` / `system`) se persiste en `localStorage` con clave `theme`. No vive en NgRx; vive en `ThemeService` (`core/theme/`). Ver [D-DS-16](../../design/decisions.md).

---

## D-STATE-15: Invalidación de `resource` tras escritura

Cuando una escritura afecta a un `resource` cacheado, el contenedor debe llamar a `resource.reload()`.

**Razón**: `resource` no tiene invalidación automática.

---

## Resumen

| ID         | Decisión                                     |
| ---------- | -------------------------------------------- |
| D-STATE-01 | Signals como default                         |
| D-STATE-02 | `resource` para server state                 |
| D-STATE-03 | NgRx solo para 3 slices                      |
| D-STATE-04 | Servicios con signals para estado de feature |
| D-STATE-05 | Signals locales para estado de componente    |
| D-STATE-06 | Reactive Forms para form state               |
| D-STATE-07 | `computed()` para estado derivado            |
| D-STATE-08 | `effect()` solo para sincronización externa  |
| D-STATE-09 | `localStorage` para borradores               |
| D-STATE-10 | Sin NgRx Effects para data fetching          |
| D-STATE-11 | Estado de sesión en NgRx                     |
| D-STATE-12 | Estado de taller activo en NgRx              |
| D-STATE-13 | Catálogos en NgRx                            |
| D-STATE-14 | Persistencia de NgRx                         |
| D-STATE-15 | Invalidación de `resource` tras escritura    |

---

## Referencias

- [README de state-management](./README.md)
- [Taxonomía](./taxonomy.md)
- [Árbol de decisión](./decision-tree.md)
- [ADR-005: Estrategia de estado](../adr/ADR-005-estrategia-estado.md)

---

_Decisiones Transversales — Estado v1.0_
