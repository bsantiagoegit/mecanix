# Modelo Conceptual (ERD) — Índice

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026
- **Entidades:** 20
- **Relaciones:** 22
- **Próxima revisión:** Al cierre del modelo relacional PostgreSQL

## Propósito

Definir las **entidades del dominio, sus atributos conceptuales, relaciones y cardinalidades**, antes de tocar PostgreSQL. Este modelo es la base para:

1. El modelo relacional PostgreSQL (siguiente entregable).
2. La estructura de features en Angular.
3. Los tipos TypeScript en el frontend.
4. La estrategia de RLS.

**No es un modelo físico.** No incluye tipos de datos PostgreSQL, constraints, índices ni políticas RLS. Eso es el siguiente entregable.

## Contenido

- [`erd.md`](./erd.md) — Diagrama ERD (mermaid) con atributos de las 20 entidades.
- [`entities.md`](./entities.md) — Descripción en prosa de cada entidad, agrupadas por área del dominio.
- [`open-questions.md`](./open-questions.md) — Preguntas abiertas, alternativas consideradas, trade-offs y riesgos.

## Decisiones de modelado

| #    | Decisión                                                                     | Razón                                                                           |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| D-01 | `customers` y `vehicles` son **por taller**, no globales                     | Privacidad entre talleres + independencia operativa                             |
| D-02 | `users` es **global**, con rol por taller vía `workshop_members`             | Una persona puede trabajar en 2 talleres con el mismo login                     |
| D-03 | `work_iterations` es **entidad**, no campo                                   | Refleja ciclos de hallazgo → diagnóstico → cotización → aprobación → reparación |
| D-04 | `items` es **una tabla** con `type` (`part` \| `supply`)                     | Simplifica queries y UI; separable después si diverge                           |
| D-05 | `photos` es **tabla** con relación polimórfica (`entity_type` + `entity_id`) | Una foto puede asociarse a intake, finding, repair, etc.                        |
| D-06 | `approvals` se vincula a `recommended_repairs`, no a `quotes`                | RT-14: aprobación por reparación individual                                     |
| D-07 | `warranties` se vincula a `work_orders`, no a `performed_repairs`            | La garantía es del trabajo completo                                             |
| D-08 | `work_order_status_history` es **tabla de auditoría**                        | No tiene lógica de negocio, solo registra cambios                               |
| D-09 | `repair_findings` es tabla intermedia N:M                                    | RT: una reparación puede resolver múltiples hallazgos                           |
| D-10 | `vehicle_ownerships` es temporal                                             | RT-15: vehículo independiente del cliente, transferible                         |

## Relaciones clave

| Relación                            | Cardinalidad | Notas                                                 |
| ----------------------------------- | ------------ | ----------------------------------------------------- |
| Workshop → WorkshopMember           | 1:N          | Un taller tiene N miembros                            |
| Workshop → Customer                 | 1:N          | Aislamiento multi-tenant                              |
| Workshop → Vehicle                  | 1:N          | Aislamiento multi-tenant                              |
| Workshop → WorkOrder                | 1:N          | Aislamiento multi-tenant                              |
| User → WorkshopMember               | 1:N          | Un usuario en N talleres                              |
| Customer ↔ Vehicle                  | N:M          | Vía `vehicle_ownerships` (temporal)                   |
| Vehicle → WorkOrder                 | 1:N          | Un vehículo tiene N órdenes                           |
| WorkOrder → VehicleIntake           | 1:1          | Cada orden tiene un intake                            |
| WorkOrder → WorkIteration           | 1:N          | Iteraciones secuenciales                              |
| WorkIteration → Inspection          | 1:N          | Una iteración puede tener N inspecciones              |
| Inspection → Finding                | 1:N          | Una inspección genera N hallazgos                     |
| Finding → Diagnosis                 | 1:N          | Un hallazgo genera N diagnósticos                     |
| Finding ↔ RecommendedRepair         | N:M          | Vía `repair_findings`                                 |
| RecommendedRepair → Approval        | 1:N          | Una reparación puede tener N aprobaciones (histórico) |
| RecommendedRepair → PerformedRepair | 1:N          | Una reparación puede ejecutarse en N partes           |
| PerformedRepair → LaborEntry        | 1:N          | Múltiples entradas de tiempo                          |
| WorkIteration → Quote               | 1:1          | Una cotización por iteración                          |
| Quote → QuoteItem                   | 1:N          | Items de la cotización                                |
| RecommendedRepair → RepairItem      | 1:N          | Items de la reparación                                |
| Item → Supplier                     | N:1          | Un item tiene un proveedor                            |
| WorkOrder → Warranty                | 1:1          | Una garantía por orden                                |
| WorkOrder → Delivery                | 1:1          | Una entrega por orden                                 |
| Photo → Entity                      | N:1          | Relación polimórfica                                  |

## Referencias

- [Glosario del dominio](../glossary.md)
- [Actores y roles](../actors-and-roles.md)
- [Diagrama de estados](../state-machine.md)
- [Reglas de negocio](../business-rules.md)
- [Casos de uso](../use-cases/README.md)

_Modelo Conceptual v1.0 — Documento vivo. Próxima revisión al cierre del modelo relacional PostgreSQL._
