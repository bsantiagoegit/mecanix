# Estrategia de Testing

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.2
- **Fecha:** Octubre 2026
- **Runner unit/integration:** Vitest (nativo de Angular 21, vía `ng test` — sin `vitest.config.ts`)
- **Runner E2E:** Playwright
- **Próxima revisión:** Al implementar el primer feature completo

---

## Propósito

Define cómo se testea el proyecto: qué se testea, con qué herramienta, con qué cobertura mínima y con qué prioridades.

**No incluye** implementación de tests (van con cada feature). **No incluye** la configuración de CI/CD (va en Operations).

---

## Orden de lectura

1. [`decisions.md`](./decisions.md) — Decisiones transversales (D-TEST-01 a D-TEST-15). **Empieza aquí.**
2. [`strategy.md`](./strategy.md) — Qué se testea, cobertura, pirámide.
3. [`tools.md`](./tools.md) — Vitest, Playwright, Supabase local.
4. [`unit-tests.md`](./unit-tests.md) — Cómo testear servicios y componentes.
5. [`integration-tests.md`](./integration-tests.md) — Cómo testear RLS, triggers, RPCs.
6. [`e2e-tests.md`](./e2e-tests.md) — Cómo testear flujos críticos.
7. [`conventions.md`](./conventions.md) — Naming, ubicación, mocks.

---

## Principios

1. **3 niveles, no 5**: unit, integration, E2E.
2. **Vitest para unit e integration**. Playwright para E2E.
3. **Supabase local para integration**. No contra la nube.
4. **Cobertura pragmática**: 80% data services, 90% RPCs/triggers, 100% RLS.
5. **RLS se testea en PostgreSQL**, no en Angular.
6. **E2E solo para flujos críticos**. ~10 tests en MVP.
7. **Sin snapshot tests**. Sin tests de performance en MVP.
8. **Mocks compartidos** en `src/testing/mocks/`.

---

## Estado actual

| Documento              | Versión | Estado     |
| ---------------------- | ------- | ---------- |
| `decisions.md`         | 1.1     | ✅ Estable |
| `strategy.md`          | 1.1     | ✅ Estable |
| `tools.md`             | 1.2     | ✅ Estable |
| `unit-tests.md`        | 1.0     | ✅ Estable |
| `integration-tests.md` | 1.0     | ✅ Estable |
| `e2e-tests.md`         | 1.0     | ✅ Estable |
| `conventions.md`       | 1.1     | ✅ Estable |

---

## Referencias

- [Arquitectura Frontend](../architecture/frontend/README.md)
- [Estrategia de Seguridad](../architecture/security/README.md)
- [Modelo Relacional](../architecture/data-model/README.md)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [Testing Library Angular](https://testing-library.com/docs/angular-testing-library/intro/)

---

_Estrategia de Testing v1.2 — Documento vivo._
