# Dominio — Sistema de Gestión para Taller Mecánico

Este directorio contiene la definición del negocio. **Es la fuente de verdad.**
Si algo en el código contradice estos documentos, el código está mal.

## Orden de lectura

1. [`glossary.md`](./glossary.md) — Lenguaje ubicuo. Empieza aquí.
2. [`actors-and-roles.md`](./actors-and-roles.md) — Quién hace qué.
3. [`state-machine.md`](./state-machine.md) — Ciclo de vida de una orden.
4. [`business-rules.md`](./business-rules.md) — Reglas transversales.
5. [`use-cases/`](./use-cases/) — Qué se construye, feature por feature.
6. [`conceptual-model.md`](./conceptual-model.md) — Entidades y relaciones (ERD).

## Convenciones de referencia

- Caso de uso: `UC-XXX-NN` (ej: `UC-WO-01`)
- Regla de negocio: `RT-NN` (ej: `RT-03`)
- Transición de estado: `T-NN` (ej: `T-14`)
- Decisión de arquitectura: `ADR-NNN` (ej: `ADR-002`)

## Estado actual

- Glosario: v2 (estable)
- Casos de uso: v1.2 (estable, pendiente validación con taller)
- Diagrama de estados: v1 (estable)
- Modelo conceptual: pendiente
