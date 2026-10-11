[← Índice de policies](./README.md)

# Clientes y vehículos

### `customers`

```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select_member ON customers
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND deleted_at IS NULL);

CREATE POLICY customers_insert_advisor_owner ON customers
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY customers_update_advisor_owner ON customers
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
```

### `vehicles`

```sql
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicles_select_member ON vehicles
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND deleted_at IS NULL);

CREATE POLICY vehicles_insert_advisor_owner ON vehicles
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY vehicles_update_advisor_owner ON vehicles
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
```

### `vehicle_ownerships`

```sql
ALTER TABLE vehicle_ownerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_ownerships_select_member ON vehicle_ownerships
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY vehicle_ownerships_insert_advisor_owner ON vehicle_ownerships
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY vehicle_ownerships_update_advisor_owner ON vehicle_ownerships
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
```
