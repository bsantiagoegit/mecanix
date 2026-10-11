[← Índice de policies](./README.md)

# Órdenes de trabajo

### `work_orders`

```sql
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_orders_select_member ON work_orders
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY work_orders_insert_advisor_owner ON work_orders
  FOR INSERT TO authenticated
  WITH CHECK (
    auth_is_advisor_or_owner_in(workshop_id)
    AND status = 'draft'
    AND advisor_id = auth.uid()
  );

CREATE POLICY work_orders_update_member ON work_orders
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
```

### `vehicle_intakes`

```sql
ALTER TABLE vehicle_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_intakes_select_member ON vehicle_intakes
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY vehicle_intakes_insert_advisor_owner ON vehicle_intakes
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));
```

### `work_iterations`

```sql
ALTER TABLE work_iterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_iterations_select_member ON work_iterations
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY work_iterations_insert_advisor_owner ON work_iterations
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY work_iterations_update_member ON work_iterations
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
```

### `work_order_status_history`

```sql
ALTER TABLE work_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY status_history_select_owner ON work_order_status_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
       WHERE wo.id = work_order_status_history.work_order_id
         AND wo.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_owner_in(wo.workshop_id)
    )
  );
```
