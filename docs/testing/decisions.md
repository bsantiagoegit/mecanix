# Decisiones Transversales — Testing

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Decisiones que aplican a **toda la estrategia de testing**. Se documentan aquí para no repetirlas.

---

## D-TEST-01: Tres niveles, no cinco

3 niveles: **unit** (Vitest), **integration** (Vitest + Supabase local), **E2E** (Playwright).

**Razón**: 3 niveles son suficientes para el tamaño del proyecto. No contract tests, no visual regression, no mutation testing.

---

## D-TEST-02: Vitest como runner único

**Vitest** para unit e integration.

**Razón**: runner estable en Angular 21. Más rápido que Karma. Soporta ESM nativo.

---

## D-TEST-03: Playwright para E2E

**Playwright** para E2E.

**Razón**: rápido, confiable, soporta PWA, simula cámara. Cypress descartado.

---

## D-TEST-04: Supabase local para integration

Los integration tests corren contra **Supabase local** (`supabase start`).

**Razón**: aislado, rápido, reproducible. Permite testear RLS, triggers y RPCs.

---

## D-TEST-05: Cobertura mínima por capa

| Capa               | Cobertura |
| ------------------ | --------- |
| Data services      | 80%       |
| Componentes (dumb) | 60%       |
| Contenedores       | 50%       |
| Guards             | 80%       |
| Interceptors       | 80%       |
| Stores NgRx        | 70%       |
| Rutas              | 30%       |
| RPCs y triggers    | 90%       |
| Policies RLS       | 100%      |

**Razón**: no 100% global. Los RPCs/RLS son críticos → 90-100%. Los componentes presentacionales son simples → 60%. Las rutas simples no necesitan tests exhaustivos (30%).

**Nota**: las coberturas son una guía, no una obsesión. Si un test no aporta valor, no se escribe.

---

## D-TEST-06: RLS se testea en PostgreSQL

Las policies de RLS se testean con **SQL directo** (Vitest + `pg` client).

**Razón**: RLS es seguridad de PostgreSQL. Testearla desde Angular es indirecto. Con `pg` se simulan usuarios vía `SET request.jwt.claims`.

---

## D-TEST-07: Triggers y RPCs se testean con SQL directo

Triggers y RPCs se testean con **SQL directo**.

**Razón**: son lógica de PostgreSQL. Se testean desde PostgreSQL, no desde Angular.

---

## D-TEST-08: Componentes con Testing Library

Usar `@testing-library/angular`.

**Razón**: tests que se parecen al uso real. `getByRole`, `getByLabelText`, `userEvent`.

---

## D-TEST-09: Mock de Supabase con `vi.mock()`

En unit tests de data services, mockear `SupabaseClient` con `vi.mock()`.

**Regla**: si un test necesita mockear más de 3 niveles de Supabase, es integration test, no unit.

---

## D-TEST-10: E2E solo para flujos críticos

E2E solo para **5 flujos críticos** (login+crear orden, inspección+aprobación, cliente+vehículo+orden, cambio de taller, cambio de tema).

**Total E2E en MVP**: ~10 tests.

---

## D-TEST-11: Sin tests de snapshot

**No** usar snapshot tests.

**Razón**: se vuelven ruido. Cambias un espacio y hay que regenerar. No aportan valor.

---

## D-TEST-12: CI corre unit + integration, no E2E en cada push

- **En cada push**: unit + integration + lint + typecheck.
- **En PR a main**: + E2E.
- **En schedule**: E2E completo.

**Razón**: E2E es lento. No vale la pena en cada push.

**Nota**: configuración detallada va en Operations (entregable 16).

---

## D-TEST-13: Sin tests de performance en MVP

**No** implementar tests de performance.

**Razón**: 4 usuarios por taller, no necesita carga. Fase 2 si el SaaS crece.

---

## D-TEST-14: Mocks compartidos en `testing/mocks/`

Los mocks reutilizables viven en `src/testing/mocks/`.

**Razón**: no duplicar mocks. Cambiar un mock se refleja en todos los tests.

---

## D-TEST-15: Sin tests para boilerplate

No testear: modelos, rutas simples, config de app, CSS.

**Razón**: son declarativos, no tienen lógica. Testearlos es ruido.

---

## Resumen

| ID        | Decisión                                  |
| --------- | ----------------------------------------- |
| D-TEST-01 | 3 niveles (unit, integration, E2E)        |
| D-TEST-02 | Vitest como runner único                  |
| D-TEST-03 | Playwright para E2E                       |
| D-TEST-04 | Supabase local para integration           |
| D-TEST-05 | Cobertura mínima por capa                 |
| D-TEST-06 | RLS se testea en PostgreSQL               |
| D-TEST-07 | Triggers y RPCs con SQL directo           |
| D-TEST-08 | Componentes con Testing Library           |
| D-TEST-09 | Mock de Supabase con `vi.mock()`          |
| D-TEST-10 | E2E solo para flujos críticos             |
| D-TEST-11 | Sin snapshot tests                        |
| D-TEST-12 | CI: unit + integration en push, E2E en PR |
| D-TEST-13 | Sin tests de performance en MVP           |
| D-TEST-14 | Mocks compartidos                         |
| D-TEST-15 | Sin tests para boilerplate                |

---

## Referencias

- [README de testing](./README.md)
- [Estrategia](./strategy.md)
- [Herramientas](./tools.md)

---

_Decisiones Transversales — Testing v1.1_
