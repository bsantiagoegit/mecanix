# Modelo Relacional PostgreSQL — Índice

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026
- **Tablas:** 27
- **Próxima revisión:** Al implementar migraciones en Supabase

---

## Propósito

Transformar el modelo conceptual en un **esquema relacional concreto** para PostgreSQL. Este documento es la fuente de verdad para:

1. Las migraciones SQL en `supabase/migrations/`.
2. Los tipos TypeScript en el frontend.
3. La estrategia de RLS (siguiente entregable).
4. Los RPCs (siguiente entregable).

**No incluye** RLS ni RPCs. **No incluye** migraciones ejecutables.

## Contenido

- [`tables/`](./tables/README.md) — Definición de las 27 tablas (DDL completo: columnas, tipos, constraints, índices), agrupadas por área del dominio.
- [`triggers.md`](./triggers.md) — Triggers: `updated_at` automático, numeración de orden, historial de transiciones, garantía automática.

---

## Convenciones

| Aspecto      | Decisión                                               | Razón                                                       |
| ------------ | ------------------------------------------------------- | ------------------------------------------------------------- |
| PK           | `uuid` con `gen_random_uuid()`                         | Único global, no expone info, facilita migración            |
| Timestamps   | `timestamptz`                                          | Sin ambigüedad de zona horaria                              |
| Strings      | `text`                                                 | Mismo rendimiento que `varchar(n)`, sin límites arbitrarios |
| Dinero       | `numeric(12,2)`                                        | Exacto, sin errores de redondeo                             |
| JSON         | `jsonb`                                                | Solo para metadata variable                                 |
| Enums        | `text` + `CHECK`                                       | Más flexible que `CREATE TYPE ... AS ENUM`                  |
| Soft delete  | `deleted_at timestamptz`                               | Solo en `workshops`, `customers`, `vehicles`                |
| Auditoría    | `created_at`, `updated_at`, `created_by`, `updated_by` | En todas las tablas mutables                                |
| FKs          | `ON DELETE` explícito                                  | Default (`NO ACTION`) es confuso                            |
| Multi-tenant | `workshop_id` en toda tabla de negocio                 | RLS sin JOIN                                                |

---

## Decisiones transversales

### D-T-01: UUID v4 como PK

Todas las tablas de negocio usan `uuid` con `gen_random_uuid()`. Excepción: `roles` usa `text` como PK (catálogo cerrado).

### D-T-02: `timestamptz`

Todos los timestamps son `timestamptz`. Ecuador es UTC-5, Supabase corre UTC. Con `timestamptz` no hay ambigüedad.

### D-T-03: `text` sin límite arbitrario

PostgreSQL trata `text` y `varchar(n)` igual en rendimiento. Los límites reales se validan con `CHECK`.

### D-T-04: `numeric(12,2)` para dinero

Exacto, hasta 9,999,999,999.99. Suficiente para un taller.

### D-T-05: `jsonb` solo en metadata

`jsonb` se usa solo en `work_order_status_history.metadata`. El resto de datos va en columnas.

### D-T-06: Soft delete selectivo

Soft delete en `workshops`, `customers`, `vehicles`. Las órdenes y entidades relacionadas no se eliminan; se cancelan con estado + motivo.

### D-T-07: Auditoría básica

Todas las tablas mutables tienen `created_at`, `updated_at`. `created_by` y `updated_by` donde aplique.

### D-T-08: CHECK constraints para enums

`text` + `CHECK (col IN (...))`. Más flexible que `CREATE TYPE ... AS ENUM`.

### D-T-09: `ON DELETE` explícito

Cada FK especifica `RESTRICT`, `CASCADE` o `SET NULL` según corresponda.

### D-T-10: `workshop_id` en tablas de negocio

Todas las tablas de negocio tienen `workshop_id uuid NOT NULL REFERENCES workshops(id)`. Excepción: `users` (global), `roles` (catálogo global).

---

## Resumen de tablas

| #   | Tabla                       | Soft delete | workshop_id    | Auditoría |
| --- | ---------------------------- | ----------- | -------------- | --------- |
| 1   | `roles`                     | No          | No             | No        |
| 2   | `workshops`                 | Sí          | — (es la raíz) | Sí        |
| 3   | `users`                     | No          | No             | Parcial   |
| 4   | `workshop_members`          | No          | Sí             | Sí        |
| 5   | `customers`                 | Sí          | Sí             | Sí        |
| 6   | `vehicles`                  | Sí          | Sí             | Sí        |
| 7   | `vehicle_ownerships`        | No          | Sí             | Parcial   |
| 8   | `work_orders`               | No          | Sí             | Sí        |
| 9   | `vehicle_intakes`           | No          | Sí             | Parcial   |
| 10  | `work_iterations`           | No          | Sí             | Parcial   |
| 11  | `inspections`               | No          | Sí             | Parcial   |
| 12  | `findings`                  | No          | Sí             | Sí        |
| 13  | `diagnoses`                 | No          | Sí             | Sí        |
| 14  | `recommended_repairs`       | No          | Sí             | Sí        |
| 15  | `repair_findings`           | No          | No (se deriva) | Parcial   |
| 16  | `approvals`                 | No          | Sí             | Parcial   |
| 17  | `performed_repairs`         | No          | Sí             | Parcial   |
| 18  | `labor_entries`             | No          | Sí             | Parcial   |
| 19  | `quotes`                    | No          | Sí             | Sí        |
| 20  | `quote_items`               | No          | No (se deriva) | Parcial   |
| 21  | `repair_items`              | No          | Sí             | Sí        |
| 22  | `items_catalog`             | No          | Sí             | Sí        |
| 23  | `suppliers`                 | No          | Sí             | Sí        |
| 24  | `warranties`                | No          | Sí             | Parcial   |
| 25  | `deliveries`                | No          | Sí             | Parcial   |
| 26  | `photos`                    | No          | Sí             | Parcial   |
| 27  | `work_order_status_history` | No          | No (se deriva) | Parcial   |

---

## Referencias

- [Modelo conceptual](../../domain/conceptual-model/README.md)
- [Glosario del dominio](../../domain/glossary.md)
- [Reglas de negocio](../../domain/business-rules.md)
- [Diagrama de estados](../../domain/state-machine.md)
- [Actores y roles](../../domain/actors-and-roles.md)
- [Casos de uso](../../domain/use-cases/README.md)

---

_Modelo Relacional PostgreSQL v1.0 — Documento vivo. Próxima revisión al implementar migraciones en Supabase._
