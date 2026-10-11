# Estrategia de Estado

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026
- **Framework:** Angular 21
- **Próxima revisión:** Al implementar el primer feature completo

---

## Propósito

Define **qué tipo de estado vive dónde** en la aplicación Angular. Responde a las preguntas:

- ¿Qué va en signals locales?
- ¿Qué va en NgRx store global?
- ¿Qué va en `resource`?
- ¿Qué va en servicios?
- ¿Qué va en `localStorage`?

Y sobre todo:

- **¿Cuándo NO usar NgRx?**
- **¿Cuándo NO usar signals?**
- **¿Cuándo NO usar `resource`?**

---

## Orden de lectura

1. [`decisions.md`](./decisions.md) — Decisiones transversales (D-STATE-01 a D-STATE-15). **Empieza aquí.**
2. [`taxonomy.md`](./taxonomy.md) — Taxonomía de los 7 tipos de estado.
3. [`decision-tree.md`](./decision-tree.md) — Árbol de decisión.
4. [`antipatterns.md`](./antipatterns.md) — Antipatrones a evitar.
5. [`examples.md`](./examples.md) — Ejemplos concretos.

---

## Principios

1. **Signals como default** para todo estado que no sea server state ni global.
2. **`resource` para server state**. Nunca NgRx para datos de Supabase.
3. **NgRx solo para 3 slices**: `auth`, `workshops`, `catalogs`.
4. **Servicios con signals** para estado de feature compartido.
5. **Signals locales** para estado efímero de componente.
6. **Reactive Forms** para formularios. Sin sincronización con signals.
7. **`computed()` para estado derivado**. Nunca `effect()`.
8. **`effect()` solo para sincronización externa** (`localStorage`, `document.title`).
9. **`localStorage` para borradores** de formularios.
10. **Sin NgRx Effects para data fetching**.

---

## Estado actual

| Documento          | Versión | Estado     |
| ------------------ | ------- | ---------- |
| `decisions.md`     | 1.0     | ✅ Estable |
| `taxonomy.md`      | 1.0     | ✅ Estable |
| `decision-tree.md` | 1.0     | ✅ Estable |
| `antipatterns.md`  | 1.0     | ✅ Estable |
| `examples.md`      | 1.0     | ✅ Estable |

---

## Referencias

- [ADR-005: Estrategia de estado](../adr/ADR-005-estrategia-estado.md)
- [Arquitectura Frontend](../frontend/README.md)
- [Angular signals](https://angular.dev/guide/signals)
- [NgRx](https://ngrx.io/)

---

_Estrategia de Estado v1.0 — Documento vivo._
