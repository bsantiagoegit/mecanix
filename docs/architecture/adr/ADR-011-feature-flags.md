# ADR-011: Feature flags

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

El proyecto es un SaaS multi-tenant que se venderá a múltiples talleres. En el futuro, cada taller podría necesitar:

1. **Configuraciones personalizadas** (ej: días de expiración de cotización distintos, moneda distinta).
2. **Funcionalidades activadas/desactivadas por taller** (ej: módulo de facturación electrónica solo para algunos).
3. **Activación gradual de código nuevo** (canary release, beta, kill switch).

El desarrollador tiene experiencia previa con feature flags en otro proyecto (migración de multi-repo a monorepo con deploy a múltiples dominios). Quiere evaluar si aplica aquí.

Hay que distinguir:

- **Configuración por taller**: ajustar comportamiento por tenant. Largo plazo.
- **Feature flags**: activar código nuevo en runtime. Corto plazo.

---

## Decisión

**No** implementar feature flags en MVP.

**Para configuración por taller**: usar columnas explícitas en `workshops`.

**Para funcionalidades por taller** (Fase 2): usar tabla `workshop_features`.

**Para feature flags** (Fase 3): evaluar servicio externo (Unleash, Flagsmith).

---

## Alternativas consideradas

### Alternativa A: LaunchDarkly desde el MVP

- **Descripción**: servicio SaaS de feature flags.
- **Ventajas**: potente, dashboards, SDK maduro.
- **Desventajas**: costo ($10/usuario/mes), dependencia externa, overkill para 1 taller.
- **Razón de descarte**: no hay nada que flagear con 1 taller y 1 desarrollador.

### Alternativa B: Unleash self-hosted desde el MVP

- **Descripción**: servicio open-source self-hosted.
- **Ventajas**: gratis, control total.
- **Desventajas**: infraestructura adicional, complejidad innecesaria.
- **Razón de descarte**: mismo que A.

### Alternativa C: Feature flags caseros (tabla en DB)

- **Descripción**: tabla `feature_flags` con activación por taller.
- **Ventajas**: sin dependencia externa.
- **Desventajas**: reinventar la rueda. No tiene dashboards, ni segmentación, ni SDK.
- **Razón de descarte**: si se necesitan feature flags, vale la pena usar una herramienta.

### Alternativa D: Configuración por taller con columnas explícitas (elegida)

- **Descripción**: cada configuración es una columna en `workshops`.
- **Ventajas**: tipado, consultable, sin magia.
- **Desventajas**: cada configuración nueva requiere migración.
- **Razón de elección**: es lo que se necesita, no feature flags.

### Alternativa E: Tabla `workshop_features` (elegida para Fase 2)

- **Descripción**: tabla con `(workshop_id, feature_key, enabled)`.
- **Ventajas**: agregar funcionalidad es un `INSERT`, no una migración.
- **Desventajas**: menos tipado.
- **Razón de elección**: si aparecen funcionalidades por taller, esta tabla es más flexible que columnas booleanas.

---

## Consecuencias

### Positivas

- Sin dependencia externa en MVP.
- Sin complejidad innecesaria.
- La configuración por taller ya existe y es suficiente.
- Se puede agregar feature flags después sin refactor.

### Negativas

- Si en Fase 3 se necesitan feature flags, habrá que invertir tiempo en integrar la herramienta.
- No hay canary releases ni kill switches.

### Neutras

- La decisión es reversible: si se necesita, se agrega.
- El costo de migrar a feature flags en el futuro es bajo.

---

## Referencias

- [Multi-tenant](../multi-tenant/README.md)
- [Configuración por taller](../multi-tenant/workshop-settings.md)
- [Feature flags](../multi-tenant/feature-flags.md)
- [ADR-003: Multi-tenant desde el día 1](./ADR-003-multi-tenant.md)

---

_ADR-011 — Feature flags_
