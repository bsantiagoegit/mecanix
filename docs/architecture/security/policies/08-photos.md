# Policies: Fotos

**Tabla**: `photos`

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## `photos`

**Regla**: cualquier miembro ve. Cualquier miembro sube. En MVP, no se eliminan desde la app.

```sql
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY photos_select_member ON photos
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY photos_insert_member ON photos
  FOR INSERT
  TO authenticated
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()) AND uploaded_by = auth.uid());

-- Sin UPDATE, sin DELETE en MVP.
```

**Nota**: la validación de que `entity_id` exista y pertenezca al taller se hace en el RPC `add_photo()`. RLS no puede validarlo porque es polimórfico.

**Decisión D-RLS-07**: `photos` tiene `workshop_id` directo, entonces RLS funciona sin JOIN.

---

## Referencias

- [README de policies](./README.md)
- [Decisiones transversales](../decisions.md)
- [Helpers](../helpers.md)
- [Tablas: Photos](../../data-model/tables/08-photos.md)

---

_Policies de Fotos v1.0_
