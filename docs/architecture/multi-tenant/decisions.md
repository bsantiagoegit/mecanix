# Decisiones Transversales — Multi-tenant

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Decisiones sobre multi-tenant y configuración por taller.

---

## D-MT-01: Multi-tenant con `workshop_id`

Todas las tablas de negocio tienen `workshop_id`. RLS filtra por taller.

**Razón**: aislamiento de datos por taller. Un usuario solo ve datos de su taller.

**Referencia**: [ADR-003](../adr/ADR-003-multi-tenant.md).

---

## D-MT-02: Configuración por taller en columnas explícitas

Cada configuración por taller es una **columna explícita** en `workshops`, con tipo, default y CHECK constraint.

**Configuraciones actuales**:

- `capacity` (int, default 4)
- `min_intake_photos` (int, default 4)
- `quote_expiration_days` (int, default 7)
- `warranty_days` (int, default 14)
- `currency` (char(3), default 'USD')
- `timezone` (text, default 'America/Guayaquil')

**Razón**: tipado fuerte, consultable, sin magia.

**Cuándo migrar a JSONB**: cuando haya ~20+ configuraciones. No antes.

---

## D-MT-03: Sin feature flags en MVP

**No** se implementan feature flags en MVP.

**Razón**:

- No hay nada que flagear con 1 taller y 1 desarrollador.
- Agrega complejidad (servicio externo, dependencia, SDK, dashboard).
- El problema real es configuración por taller, no activar código en runtime.
- Se puede agregar después sin refactor.

**Referencia**: [ADR-011](../adr/ADR-011-feature-flags.md).

---

## D-MT-04: Tabla `workshop_features` en Fase 2

Cuando aparezcan funcionalidades que solo algunos talleres necesiten, se modelan con una tabla `workshop_features`.

```sql
CREATE TABLE workshop_features (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  enabled_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, feature_key)
);
```

**Razón**: agregar una funcionalidad es un `INSERT`, no una migración. Más flexible que columnas booleanas.

**Cuándo**: cuando haya 2-5 talleres y al menos uno necesite una funcionalidad que otro no.

---

## D-MT-05: Servicio externo de feature flags (Fase 3)

**No** se implementa LaunchDarkly, Unleash ni Flagsmith en MVP ni en Fase 2.

**Cuándo evaluar**: 10+ talleres con necesidades divergentes.

**Razón**: es overkill hasta que el negocio lo justifique.

---

## Resumen

| ID      | Decisión                                        |
| ------- | ----------------------------------------------- |
| D-MT-01 | Multi-tenant con `workshop_id`                  |
| D-MT-02 | Configuración por taller en columnas explícitas |
| D-MT-03 | Sin feature flags en MVP                        |
| D-MT-04 | Tabla `workshop_features` en Fase 2             |
| D-MT-05 | Sin servicio externo en MVP ni Fase 2           |

---

## Referencias

- [README de multi-tenant](./README.md)
- [Configuración por taller](./workshop-settings.md)
- [Feature flags](./feature-flags.md)

---

_Decisiones Transversales — Multi-tenant v1.0_
