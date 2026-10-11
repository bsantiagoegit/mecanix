[← Índice de policies](./README.md)

# Fotos

### `photos`

```sql
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY photos_select_member ON photos
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY photos_insert_member ON photos
  FOR INSERT TO authenticated
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()) AND uploaded_by = auth.uid());
```
