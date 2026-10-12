# Arquitectura Frontend

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.2
- **Fecha:** Octubre 2026
- **Framework:** Angular 21
- **Próxima revisión:** Al implementar el primer feature completo

---

## Propósito

Define la arquitectura del frontend Angular: cómo se organiza el código, qué responsabilidad tiene cada capa, cómo se comunican, y cómo se estructura un feature típico.

**No incluye** la estrategia de estado detallada (ver [ADR-005](../adr/ADR-005-estrategia-estado.md)). **No incluye** la estrategia PWA (entregable 13). **No incluye** el design system (entregable 14).

---

## Orden de lectura

1. [`decisions.md`](./decisions.md) — Decisiones transversales (D-FE-01 a D-FE-18). **Empieza aquí.**
2. [`structure.md`](./structure.md) — Estructura de carpetas (`core/`, `shared/`, `features/`).
3. [`feature-template.md`](./feature-template.md) — Plantilla de un feature típico.
4. [`data-flow.md`](./data-flow.md) — Flujos de lectura y escritura.
5. [`error-handling.md`](./error-handling.md) — Manejo de errores en tres niveles.
6. [`routing.md`](./routing.md) — Rutas, lazy loading, guards.

---

## Principios

1. **Feature-first**: organizar por dominio, no por tipo de archivo.
2. **Tres capas de carpetas**: `core/`, `shared/`, `features/`.
3. **Dumb vs smart**: componentes presentacionales vs contenedores.
4. **Data services**: encapsular Supabase, los componentes nunca lo tocan.
5. **`resource` para data fetching**: no `subscribe` en `ngOnInit`.
6. **Lazy loading**: cada feature se carga on-demand.
7. **`inject()` sobre constructor**: estándar en Angular 21.
8. **Guards funcionales**: no clases.
9. **Sin `resolvers`**: `resource` maneja la carga con skeleton.
10. **README por feature**: documentación autocontenida.

---

## Estado actual

| Documento             | Versión | Estado     |
| --------------------- | ------- | ---------- |
| `decisions.md`        | 1.2     | ✅ Estable |
| `structure.md`        | 1.3     | ✅ Estable |
| `feature-template.md` | 1.0     | ✅ Estable |
| `data-flow.md`        | 1.0     | ✅ Estable |
| `error-handling.md`   | 1.0     | ✅ Estable |
| `routing.md`          | 1.0     | ✅ Estable |

---

## Referencias

- [Angular 21](https://angular.dev/)
- [ADR-001: Angular 21 como framework frontend](../adr/ADR-001-angular-21.md)
- [ADR-005: Estrategia de estado](../adr/ADR-005-estrategia-estado.md)
- [Modelo relacional](../data-model/README.md)
- [Casos de uso](../../domain/use-cases/README.md)
- [Design System](../../design/README.md)

---

_Arquitectura Frontend v1.2 — Documento vivo._
