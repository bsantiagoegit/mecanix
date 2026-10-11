# Estrategia de Seguridad (RLS)

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026
- **Tablas con RLS:** 27
- **Próxima revisión:** Al implementar migraciones en Supabase

---

## Propósito

Define cómo se protege la información a nivel de base de datos. RLS es la **defensa principal**. El frontend oculta botones (UX), pero RLS es lo que realmente impide el acceso no autorizado.

**No incluye Storage** (siguiente entregable). **No incluye RPCs** (se diseñan con cada caso de uso).

---

## Orden de lectura

1. [`decisions.md`](./decisions.md) — Decisiones transversales (D-RLS-01 a D-RLS-10). **Empieza aquí.**
2. [`helpers.md`](./helpers.md) — Funciones helper reutilizables.
3. [`views.md`](./views.md) — Vistas SQL (ej: `customers_public`).
4. [`policies/`](./policies/) — Policies por grupo de tablas. Empieza por [`policies/README.md`](./policies/README.md).

---

## Principios

1. **RLS habilitado en todas las tablas**. Sin excepción.
2. **Denegar por defecto**. Si no hay policy, no hay acceso.
3. **`auth.uid()` es la fuente de verdad**. Nunca se confía en un `user_id` del cliente.
4. **Policies separadas por operación**. No `FOR ALL`.
5. **Funciones helper reutilizables**. La lógica de "a qué talleres pertenece el usuario" vive en un solo lugar.
6. **RLS + RPC + frontend** = defensa en profundidad.

---

## Estado actual

| Documento      | Versión | Estado     |
| -------------- | ------- | ---------- |
| `decisions.md` | 1.0     | ✅ Estable |
| `helpers.md`   | 1.0     | ✅ Estable |
| `views.md`     | 1.0     | ✅ Estable |
| `policies/`    | 1.0     | ✅ Estable |

---

## Referencias

- [Modelo relacional](../data-model/README.md)
- [Actores y roles](../../domain/actors-and-roles.md)
- [Reglas de negocio](../../domain/business-rules.md)
- [Glosario del dominio](../../domain/glossary.md)

---

_Estrategia de Seguridad v1.0 — Documento vivo._
