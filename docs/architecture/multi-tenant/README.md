# Multi-tenant

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026
- **Próxima revisión:** Cuando haya 2+ talleres activos

---

## Propósito

Define cómo se maneja el aislamiento multi-tenant y la configuración por taller. Aclara por qué **no** se implementan feature flags en MVP y cuándo se evaluarían.

**No incluye** implementación (va en el código). **No incluye** RLS (ver [`../security/`](../security/README.md)).

---

## Orden de lectura

1. [`decisions.md`](./decisions.md) — Decisiones transversales (D-MT-01 a D-MT-05). **Empieza aquí.**
2. [`workshop-settings.md`](./workshop-settings.md) — Configuración por taller.
3. [`feature-flags.md`](./feature-flags.md) — Estrategia de funcionalidades por taller.

---

## Principios

1. **Multi-tenant con `workshop_id`** en todas las tablas de negocio.
2. **Configuración por taller** en columnas explícitas de `workshops`.
3. **Sin feature flags en MVP**. La configuración por taller es suficiente.
4. **Sin servicio externo** hasta que el negocio lo justifique.
5. **Migrar a JSONB** cuando haya 20+ configuraciones.
6. **Tabla `workshop_features`** en Fase 2 si se necesitan funcionalidades por taller.

---

## Estado actual

| Documento              | Versión | Estado     |
| ---------------------- | ------- | ---------- |
| `decisions.md`         | 1.0     | ✅ Estable |
| `workshop-settings.md` | 1.0     | ✅ Estable |
| `feature-flags.md`     | 1.0     | ✅ Estable |

---

## Referencias

- [ADR-003: Multi-tenant desde el día 1](../adr/ADR-003-multi-tenant.md)
- [ADR-011: Feature flags](../adr/ADR-011-feature-flags.md)
- [Modelo relacional](../data-model/README.md)
- [Estrategia de Seguridad](../security/README.md)

---

_Multi-tenant v1.0 — Documento vivo._
