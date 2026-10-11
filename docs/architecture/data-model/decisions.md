# Decisiones Transversales — Modelo Relacional

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Decisiones que aplican a **todas o casi todas las tablas** del modelo relacional. Se documentan aquí para no repetirlas en cada archivo de tabla.

Si una decisión aplica a una sola tabla, va en el archivo de esa tabla.

---

## D-T-01: UUID v4 como PK

Todas las tablas de negocio usan `uuid` con `gen_random_uuid()`. Excepción: `roles` usa `text` como PK (catálogo cerrado).

**Razón**: único global, no expone info, facilita migración a multi-región.

---

## D-T-02: `timestamptz` en todo timestamp

Todos los timestamps son `timestamptz`. Ecuador es UTC-5, Supabase corre UTC. Con `timestamptz` no hay ambigüedad.

---

## D-T-03: `text` sin `varchar(n)`

PostgreSQL trata `text` y `varchar(n)` igual en rendimiento. Los límites reales se validan con `CHECK`.

---

## D-T-04: `numeric(12,2)` para dinero

Exacto, hasta 9,999,999,999.99. Suficiente para un taller.

---

## D-T-05: `jsonb` solo en metadata

`jsonb` se usa solo en `work_order_status_history.metadata`. El resto de datos va en columnas.

---

## D-T-06: Soft delete selectivo

Soft delete (`deleted_at timestamptz`) en `workshops`, `customers`, `vehicles`. Las órdenes y entidades relacionadas no se eliminan; se cancelan con estado + motivo.

---

## D-T-07: Auditoría básica

Todas las tablas mutables tienen `created_at`, `updated_at`. `created_by` y `updated_by` donde aplique.

---

## D-T-08: CHECK constraints para enums

`text` + `CHECK (col IN (...))`. Más flexible que `CREATE TYPE ... AS ENUM`.

---

## D-T-09: `ON DELETE` explícito

Cada FK especifica `RESTRICT`, `CASCADE` o `SET NULL` según corresponda.

---

## D-T-10: `workshop_id` en tablas de negocio

Todas las tablas de negocio tienen `workshop_id uuid NOT NULL REFERENCES workshops(id)`. Excepción: `users`, `roles`, y tablas derivadas (`repair_findings`, `quote_items`, `work_order_status_history`).

---

## Resumen

| ID     | Decisión                           |
| ------ | ---------------------------------- |
| D-T-01 | UUID v4 como PK                    |
| D-T-02 | `timestamptz` en todo timestamp    |
| D-T-03 | `text` sin `varchar(n)`            |
| D-T-04 | `numeric(12,2)` para dinero        |
| D-T-05 | `jsonb` solo en metadata           |
| D-T-06 | Soft delete selectivo              |
| D-T-07 | Auditoría básica                   |
| D-T-08 | CHECK constraints para enums       |
| D-T-09 | `ON DELETE` explícito              |
| D-T-10 | `workshop_id` en tablas de negocio |

---

## Referencias

- [README de data-model](./README.md)
- [Triggers](./triggers.md)
- [Tablas](./tables/README.md)

---

_Decisiones Transversales — Modelo Relacional v1.0_
