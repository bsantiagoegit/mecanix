[← Índice de policies](./README.md)

# Inspecciones y diagnósticos

### `inspections`

```sql
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY inspections_select_member ON inspections
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY inspections_insert_mechanic ON inspections
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND mechanic_id = auth.uid());

CREATE POLICY inspections_update_mechanic ON inspections
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_mechanic_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
```

### `findings`

```sql
ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY findings_select_member ON findings
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY findings_insert_mechanic ON findings
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND created_by = auth.uid());

CREATE POLICY findings_update_mechanic ON findings
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_mechanic_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
```

### `diagnoses`

```sql
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY diagnoses_select_member ON diagnoses
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY diagnoses_insert_mechanic ON diagnoses
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND created_by = auth.uid());

CREATE POLICY diagnoses_update_mechanic ON diagnoses
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_mechanic_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
```
