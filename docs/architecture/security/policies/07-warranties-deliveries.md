# Policies: Garantías y Entregas

**Tablas**: `warranties`, `deliveries`

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## `warranties`

**Regla**: cualquier miembro ve. El `INSERT` lo hace un trigger (al pasar orden a `completed`), no un usuario. Sin `INSERT` policy para usuarios.

```sql
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY warranties_select_member ON warranties
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

-- Sin INSERT. Lo hace el trigger create_warranty_on_completion().
-- Sin UPDATE, sin DELETE. Es histórico.
```

**Nota**: el trigger corre con `SECURITY DEFINER` (hereda permisos del owner de la función), puede insertar sin policy.

---

## `deliveries`

**Regla**: cualquier miembro ve. `advisor` y `owner` crean (al entregar).

```sql
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY deliveries_select_member ON deliveries
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY deliveries_insert_advisor_owner ON deliveries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

-- Sin UPDATE, sin DELETE.
```

---

## Referencias

- [README de policies](./README.md)
- [Decisiones transversales](../decisions.md)
- [Helpers](../helpers.md)
- [Tablas: Garantías y Entregas](../../data-model/tables/07-warranties-deliveries.md)

---

_Policies de Garantías y Entregas v1.0_
