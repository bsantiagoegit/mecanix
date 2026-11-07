# Policies: Tenancy y Usuarios

**Tablas**: `roles`, `workshops`, `users`, `workshop_members`

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## `roles`

**Regla**: cualquier usuario autenticado puede leer. Nadie modifica desde el cliente (solo migración).

```sql
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_select_authenticated ON roles
  FOR SELECT
  TO authenticated
  USING (true);

-- Sin INSERT, UPDATE, DELETE. Solo migración.
```

---

## `workshops`

**Regla**: un usuario ve los talleres a los que pertenece. Solo `owner` modifica. `INSERT` solo vía `service_role` (tú, manualmente en MVP).

```sql
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY workshops_select_member ON workshops
  FOR SELECT
  TO authenticated
  USING (id = ANY(auth_workshop_ids()));

CREATE POLICY workshops_update_owner ON workshops
  FOR UPDATE
  TO authenticated
  USING (auth_is_owner_in(id))
  WITH CHECK (auth_is_owner_in(id));

-- Sin INSERT (solo service_role). Sin DELETE (soft delete vía UPDATE deleted_at).
```

---

## `users`

**Regla**: un usuario ve su propio perfil. Ve los perfiles de otros usuarios con los que comparte taller (necesario para mostrar "mecánico asignado").

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_self ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_select_shared_workshop ON users
  FOR SELECT
  TO authenticated
  USING (auth_shares_workshop_with(id));

CREATE POLICY users_update_self ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Sin INSERT (lo hace el trigger handle_new_auth_user). Sin DELETE (CASCADE desde auth).
```

**Nota (v1.1)**: la versión 1.0 resolvía "comparte taller" con un `EXISTS` directo sobre `workshop_members`. Ese subquery está sujeto a la RLS de `workshop_members`, así que solo un `owner` veía a sus compañeros. Se reemplazó por el helper `auth_shares_workshop_with` (ver [helpers](../helpers.md)).

---

## `workshop_members`

**Regla**: un usuario ve sus propias membresías. Un `owner` ve todas las membresías de su taller. Solo `owner` invita y desactiva. Nadie elimina membresías.

```sql
ALTER TABLE workshop_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY workshop_members_select_self ON workshop_members
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY workshop_members_select_owner ON workshop_members
  FOR SELECT
  TO authenticated
  USING (auth_is_owner_in(workshop_id));

CREATE POLICY workshop_members_insert_owner ON workshop_members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_owner_in(workshop_id));

CREATE POLICY workshop_members_update_owner ON workshop_members
  FOR UPDATE
  TO authenticated
  USING (auth_is_owner_in(workshop_id))
  WITH CHECK (auth_is_owner_in(workshop_id));

-- Sin DELETE. Desactivar = UPDATE status = 'inactive'.
```

**Nota**: un `owner` no puede degradarse a sí mismo si es el único owner. Esa validación va en un RPC, no en RLS.

---

## Referencias

- [README de policies](./README.md)
- [Decisiones transversales](../decisions.md)
- [Helpers](../helpers.md)
- [Tablas: Tenancy](../../data-model/tables/01-tenancy.md)

---

_Policies de Tenancy v1.1_
