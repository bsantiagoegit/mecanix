[← Índice de policies](./README.md)

# Garantías y entregas

### `warranties`

```sql
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY warranties_select_member ON warranties
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));
```

### `deliveries`

```sql
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY deliveries_select_member ON deliveries
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY deliveries_insert_advisor_owner ON deliveries
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));
```
