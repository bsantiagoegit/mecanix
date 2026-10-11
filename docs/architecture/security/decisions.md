# Decisiones Transversales — Seguridad (RLS)

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Decisiones que aplican a **todas o casi todas las policies** de RLS. Se documentan aquí para no repetirlas en cada archivo de policies.

Si una decisión aplica a una sola tabla, va en el archivo de esa tabla dentro de `policies/`.

---

## D-RLS-01: RLS en todas las tablas

`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en las 27 tablas. Supabase deniega todo por defecto si RLS está habilitado y no hay policies.

**Razón**: Supabase expone PostgREST. Sin RLS, cualquier usuario autenticado podría leer cualquier tabla vía API.

---

## D-RLS-02: Funciones helper `SECURITY DEFINER`

Funciones en `public` que devuelven talleres y roles del usuario autenticado. Se usan en las policies para evitar subqueries repetidos.

**Razón**: la lógica de "a qué talleres pertenece este usuario" vive en un solo lugar. Sin helpers, cada policy necesita un subquery con JOIN a `workshop_members`.

**Detalle**: ver [`helpers.md`](./helpers.md).

---

## D-RLS-03: Policies separadas por operación

`SELECT`, `INSERT`, `UPDATE`, `DELETE` tienen policies separadas. No usar `FOR ALL`.

**Razón**: más verboso pero más auditable. Un `INSERT` y un `SELECT` tienen reglas distintas. `FOR ALL` oculta la intención.

---

## D-RLS-04: RLS es la defensa principal

Un usuario malicioso puede llamar a PostgREST directamente sin pasar por Angular. RLS protege los datos en el origen.

**Razón**: los guards de Angular son solo UX (ocultan botones). Los RPCs son defensa final para lógica compleja. RLS es defensa principal para acceso a datos.

---

## D-RLS-05: `workshop_members` con policies especiales

`workshop_members` tiene policies más restrictivas:

- Un usuario ve sus propias membresías.
- Un `owner` ve todas las membresías de su taller.
- Solo `owner` invita (INSERT) y desactiva (UPDATE).
- Nadie elimina membresías (soft delete vía `status`).

**Razón**: es la tabla más sensible. Si un usuario puede modificar sus propias membresías, puede escalar privilegios.

---

## D-RLS-06: Tablas derivadas usan `EXISTS` + JOIN

`repair_findings`, `quote_items`, `work_order_status_history` no tienen `workshop_id`. Sus policies usan `EXISTS (SELECT 1 FROM <padre> WHERE ... AND workshop_id = ANY(auth_workshop_ids()))`.

**Razón**: agregar `workshop_id` a estas tablas sería redundante y crearía riesgo de inconsistencia. `EXISTS` con JOIN es aceptable en rendimiento porque la FK ya tiene índice.

---

## D-RLS-07: `photos` con `workshop_id` directo

Aunque la relación con entidades es polimórfica (`entity_type` + `entity_id`), `workshop_id` está en la tabla. Las policies usan `workshop_id = ANY(auth_workshop_ids())` directo.

**Razón**: la relación polimórfica no tiene FK, pero `workshop_id` sí está en la tabla, entonces RLS funciona directo. La integridad de `entity_id` se valida en el RPC de creación de foto.

---

## D-RLS-08: Sin `WITH CHECK` en SELECT

Las policies `FOR SELECT` solo usan `USING`. `WITH CHECK` solo aplica a `INSERT` y `UPDATE`.

**Razón**: error de sintaxis si se pone `WITH CHECK` en `SELECT`.

---

## D-RLS-09: `service_role` para admin SaaS

Operaciones administrativas (crear taller, purgar talleres eliminados) usan `service_role` desde backend, no desde el cliente.

**Razón**: `service_role` en Supabase bypasea RLS. No queremos que un usuario autenticado normal pueda crear talleres. El panel de SaaS admin es una app separada.

**Nota**: esto es para Fase 2. En MVP, los talleres los creas tú manualmente desde el dashboard de Supabase.

---

## D-RLS-10: `auth.uid()` como fuente de verdad

Todas las policies usan `auth.uid()` (función de Supabase que devuelve el UUID del usuario autenticado). Nunca se confía en un `user_id` que venga del cliente.

**Razón**: `auth.uid()` lo setea Supabase al validar el JWT. Un cliente no puede falsificarlo. Cualquier `user_id` en el body de un request es ignorado por RLS.

---

## Resumen

| ID       | Decisión                                   |
| -------- | ------------------------------------------ |
| D-RLS-01 | RLS en todas las tablas                    |
| D-RLS-02 | Funciones helper `SECURITY DEFINER`        |
| D-RLS-03 | Policies separadas por operación           |
| D-RLS-04 | RLS es la defensa principal                |
| D-RLS-05 | `workshop_members` con policies especiales |
| D-RLS-06 | Tablas derivadas con `EXISTS` + JOIN       |
| D-RLS-07 | `photos` con `workshop_id` directo         |
| D-RLS-08 | Sin `WITH CHECK` en SELECT                 |
| D-RLS-09 | `service_role` para admin SaaS             |
| D-RLS-10 | `auth.uid()` como fuente de verdad         |

---

## Referencias

- [README de security](./README.md)
- [Helpers](./helpers.md)
- [Vistas](./views.md)
- [Policies](./policies/README.md)

---

_Decisiones Transversales — Seguridad v1.0_
