# Policies: Órdenes de Trabajo

**Tablas**: `work_orders`, `vehicle_intakes`, `work_iterations`, `work_order_status_history`

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## `work_orders`

**Regla**: cualquier miembro ve las órdenes del taller. Solo `advisor` y `owner` crean. Las transiciones de estado se validan en RPC, pero RLS permite el `UPDATE` si el usuario es miembro (el RPC valida la lógica).

```sql
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_orders_select_member ON work_orders
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY work_orders_insert_advisor_owner ON work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_is_advisor_or_owner_in(workshop_id)
    AND status = 'draft'
    AND advisor_id = auth.uid()
  );

CREATE POLICY work_orders_update_member ON work_orders
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

-- Sin DELETE. Nunca se elimina una orden.
```

**Nota sobre `INSERT`**: la condición `status = 'draft'` y `advisor_id = auth.uid()` garantiza que una orden solo se crea en estado borrador y por el advisor que la crea. El `UPDATE` no tiene restricción de rol porque las transiciones las valida el RPC `transition_work_order()`.

---

## `vehicle_intakes`

**Regla**: cualquier miembro ve. `advisor` y `owner` crean (al confirmar recepción). `mechanic` no modifica.

```sql
ALTER TABLE vehicle_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_intakes_select_member ON vehicle_intakes
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY vehicle_intakes_insert_advisor_owner ON vehicle_intakes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

-- Sin UPDATE. El intake es histórico.
-- Sin DELETE.
```

---

## `work_iterations`

**Regla**: cualquier miembro ve. `advisor` y `owner` crean (al iniciar una nueva iteración). `mechanic` puede modificar el `status` (al cerrar una iteración tras completar reparaciones), pero eso se valida en RPC.

```sql
ALTER TABLE work_iterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_iterations_select_member ON work_iterations
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY work_iterations_insert_advisor_owner ON work_iterations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY work_iterations_update_member ON work_iterations
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

-- Sin DELETE.
```

---

## `work_order_status_history`

**Regla**: solo `owner` ve el historial. `advisor` y `mechanic` no necesitan verlo. El `INSERT` lo hace un trigger.

```sql
ALTER TABLE work_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY status_history_select_owner ON work_order_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
       WHERE wo.id = work_order_status_history.work_order_id
         AND wo.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_owner_in(wo.workshop_id)
    )
  );

-- Sin INSERT, sin UPDATE, sin DELETE. Solo trigger.
```

**Nota**: el historial de transiciones es información de auditoría. Solo el dueño la ve.

---

## Referencias

- [README de policies](./README.md)
- [Decisiones transversales](../decisions.md)
- [Helpers](../helpers.md)
- [Tablas: Work Orders](../../data-model/tables/03-work-orders.md)
- [Diagrama de estados](../../../domain/state-machine.md)

---

_Policies de Órdenes de Trabajo v1.0_
