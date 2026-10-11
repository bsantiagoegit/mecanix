# Policies RLS — Índice

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Índice de policies por grupo de tablas. Cada archivo corresponde a un grupo y contiene las policies de todas las tablas de ese grupo.

---

## Archivos

| #   | Archivo                                                      | Tablas                                                                                      |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 01  | [01-tenancy.md](./01-tenancy.md)                             | `roles`, `workshops`, `users`, `workshop_members`                                           |
| 02  | [02-customers-vehicles.md](./02-customers-vehicles.md)       | `customers`, `vehicles`, `vehicle_ownerships`                                               |
| 03  | [03-work-orders.md](./03-work-orders.md)                     | `work_orders`, `vehicle_intakes`, `work_iterations`, `work_order_status_history`            |
| 04  | [04-inspections-diagnoses.md](./04-inspections-diagnoses.md) | `inspections`, `findings`, `diagnoses`                                                      |
| 05  | [05-repairs.md](./05-repairs.md)                             | `recommended_repairs`, `repair_findings`, `approvals`, `performed_repairs`, `labor_entries` |
| 06  | [06-items-quotes.md](./06-items-quotes.md)                   | `quotes`, `quote_items`, `repair_items`, `items_catalog`, `suppliers`                       |
| 07  | [07-warranties-deliveries.md](./07-warranties-deliveries.md) | `warranties`, `deliveries`                                                                  |
| 08  | [08-photos.md](./08-photos.md)                               | `photos`                                                                                    |

---

## Resumen de policies por tabla

| Tabla                       | SELECT                 | INSERT        | UPDATE        | DELETE        |
| --------------------------- | ---------------------- | ------------- | ------------- | ------------- |
| `roles`                     | authenticated          | —             | —             | —             |
| `workshops`                 | member                 | —             | owner         | —             |
| `users`                     | self + shared          | —             | self          | —             |
| `workshop_members`          | self + owner           | owner         | owner         | —             |
| `customers`                 | member                 | advisor/owner | advisor/owner | —             |
| `vehicles`                  | member                 | advisor/owner | advisor/owner | —             |
| `vehicle_ownerships`        | member                 | advisor/owner | advisor/owner | —             |
| `work_orders`               | member                 | advisor/owner | member        | —             |
| `vehicle_intakes`           | member                 | advisor/owner | —             | —             |
| `work_iterations`           | member                 | advisor/owner | member        | —             |
| `inspections`               | member                 | mechanic      | mechanic      | —             |
| `findings`                  | member                 | mechanic      | mechanic      | —             |
| `diagnoses`                 | member                 | mechanic      | mechanic      | —             |
| `recommended_repairs`       | member                 | mechanic      | member        | —             |
| `repair_findings`           | member (EXISTS)        | mechanic      | —             | —             |
| `approvals`                 | member                 | advisor/owner | —             | —             |
| `performed_repairs`         | member                 | mechanic      | mechanic      | —             |
| `labor_entries`             | member                 | mechanic      | —             | —             |
| `quotes`                    | advisor/owner          | advisor/owner | advisor/owner | —             |
| `quote_items`               | advisor/owner (EXISTS) | advisor/owner | advisor/owner | advisor/owner |
| `repair_items`              | member                 | member        | member        | —             |
| `items_catalog`             | member                 | advisor/owner | advisor/owner | advisor/owner |
| `suppliers`                 | member                 | advisor/owner | advisor/owner | advisor/owner |
| `warranties`                | member                 | —             | —             | —             |
| `deliveries`                | member                 | advisor/owner | —             | —             |
| `photos`                    | member                 | member        | —             | —             |
| `work_order_status_history` | owner (EXISTS)         | —             | —             | —             |

**Leyenda**:

- `member`: cualquier miembro activo del taller.
- `owner`: solo el rol `owner`.
- `advisor/owner`: roles `advisor` u `owner`.
- `mechanic`: solo el rol `mechanic`.
- `self`: el propio usuario.
- `EXISTS`: se valida vía `EXISTS` con JOIN al padre (tabla derivada sin `workshop_id`).
- `—`: sin policy para esa operación (operación bloqueada).

---

## Lo que NO cubre RLS

Validaciones que van en RPCs (no en policies):

1. Transiciones de estado válidas.
2. Capacidad del taller (RT-12).
3. Fotos mínimas en intake (RT-11).
4. Motivo obligatorio en cancelación (RT-02).
5. Un solo owner por taller.
6. No cerrar orden con reparaciones pendientes.
7. Expiración de cotización (RT-07).
8. Numeración secuencial de órdenes.
9. Garantía automática al completar (RT-05).
10. Historial de transiciones (RT-04).

---

## Referencias

- [README de security](../README.md)
- [Decisiones transversales](../decisions.md)
- [Helpers](../helpers.md)
- [Vistas](../views.md)

---

_Policies RLS v1.0_
