# Estrategia de Seguridad (RLS) — Índice

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026
- **Tablas con RLS:** 27
- **Roles:** owner, advisor, mechanic
- **Próxima revisión:** Al implementar migraciones en Supabase

---

## Propósito

Definir cómo se protege la información a nivel de base de datos. RLS es la **defensa principal**. El frontend oculta botones (UX), pero RLS es lo que realmente impide el acceso no autorizado.

**No incluye Storage** (siguiente entregable). **No incluye RPCs** (se diseñan con cada caso de uso).

## Contenido

- [`helpers.md`](./helpers.md) — Funciones helper `SECURITY DEFINER` usadas por las policies.
- [`policies/`](./policies/README.md) — Policies de las 27 tablas, agrupadas por área del dominio.
- [`views.md`](./views.md) — Vista `customers_public` para ocultar datos de contacto al `mechanic`.

---

## Principios

1. **RLS habilitado en todas las tablas**. Sin excepción.
2. **Denegar por defecto**. Si no hay policy, no hay acceso.
3. **`auth.uid()` es la fuente de verdad**. Nunca se confía en un `user_id` del cliente.
4. **Policies separadas por operación**. No `FOR ALL`.
5. **Funciones helper reutilizables**. La lógica de "a qué talleres pertenece el usuario" vive en un solo lugar.
6. **RLS + RPC + frontend** = defensa en profundidad.

---

## Decisiones transversales

### D-RLS-01: RLS en todas las tablas

`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en las 27 tablas. Supabase deniega todo por defecto si RLS está habilitado y no hay policies.

### D-RLS-02: Funciones helper `SECURITY DEFINER`

Funciones en `public` que devuelven talleres y roles del usuario autenticado. Se usan en las policies para evitar subqueries repetidos.

### D-RLS-03: Policies separadas por operación

`SELECT`, `INSERT`, `UPDATE`, `DELETE` tienen policies separadas. Más verboso pero más auditable.

### D-RLS-04: RLS es la defensa principal

Un usuario malicioso puede llamar a PostgREST directamente. RLS protege los datos en el origen.

### D-RLS-05: `workshop_members` con policies especiales

Solo `owner` gestiona membresías. Un usuario no puede modificar sus propias membresías.

### D-RLS-06: Tablas derivadas usan `EXISTS` + JOIN

`repair_findings`, `quote_items`, `work_order_status_history` no tienen `workshop_id`. Sus policies usan `EXISTS` con el padre.

### D-RLS-07: `photos` con `workshop_id` directo

Aunque la relación con entidades es polimórfica, `workshop_id` está en la tabla, entonces RLS funciona directo.

### D-RLS-08: Sin `WITH CHECK` en SELECT

`WITH CHECK` solo aplica a `INSERT` y `UPDATE`.

### D-RLS-09: `service_role` para admin SaaS

Operaciones administrativas (crear taller, purgar) usan `service_role` desde backend. No desde el cliente.

### D-RLS-10: `auth.uid()` como fuente de verdad

Todas las policies usan `auth.uid()`. Cualquier `user_id` del cliente es ignorado por RLS.

---

## Resumen de policies por tabla

| Tabla                       | SELECT                 | INSERT        | UPDATE        | DELETE        |
| ---------------------------- | ---------------------- | ------------- | ------------- | ------------- |
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

---

## Lo que NO cubre RLS

Estas validaciones van en RPCs:

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

## Resumen de decisiones

| #        | Decisión                                   |
| -------- | ------------------------------------------- |
| D-RLS-01 | RLS en todas las tablas                    |
| D-RLS-02 | Funciones helper `SECURITY DEFINER`        |
| D-RLS-03 | Policies separadas por operación           |
| D-RLS-04 | RLS es la defensa principal                |
| D-RLS-05 | `workshop_members` con policies especiales |
| D-RLS-06 | Tablas derivadas con `EXISTS`              |
| D-RLS-07 | `photos` con `workshop_id` directo         |
| D-RLS-08 | Sin `WITH CHECK` en SELECT                 |
| D-RLS-09 | `service_role` para admin SaaS             |
| D-RLS-10 | `auth.uid()` como fuente de verdad         |

---

## Referencias

- [Modelo relacional PostgreSQL](../data-model/README.md)
- [Actores y roles](../../domain/actors-and-roles.md)
- [Reglas de negocio](../../domain/business-rules.md)
- [Glosario del dominio](../../domain/glossary.md)

---

_Estrategia de Seguridad v1.0 — Documento vivo._
