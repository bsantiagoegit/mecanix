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

**Regla**: un usuario ve los talleres a los que pertenece. Solo `owner` modifica. No hay policy de `INSERT`: el taller se crea con la función `create_workshop()` (`SECURITY DEFINER`, [ADR-012](../../adr/ADR-012-onboarding-self-service.md)) o con `service_role`.

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

-- Sin INSERT directo: create_workshop() o service_role. Sin DELETE (soft delete vía UPDATE deleted_at).
```

---

## `users`

**Regla**: un usuario ve su propio perfil. Ve los perfiles de otros usuarios con los que comparte taller (necesario para mostrar "mecánico asignado"). Además, el `owner` ve el perfil de quienes invitó mientras la invitación está pendiente (`invited`); al aceptarse aplica la regla de taller compartido y al cancelarse deja de verlo.

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

-- El owner ve a quienes invitó (membresía `invited`) para listarlos en "Equipo".
CREATE POLICY users_select_invited_by_owner ON users
  FOR SELECT
  TO authenticated
  USING (auth_owner_invited(id));

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

**Regla**: un usuario ve sus propias membresías. Un `owner` ve todas las membresías de su taller. Solo `owner` invita y desactiva, pero **nadie inserta membresías directamente**: se crean en `create_workshop()` (el `owner`), en la Edge Function `invite-user` (invitados, con `service_role`) y se activan en `accept_invitation()`. Nadie elimina membresías.

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

-- Sin INSERT para usuarios (ver regla). La policy workshop_members_insert_owner de la migración
-- inicial se elimina en la migración de onboarding: permitía crear membresías `active`
-- sin que el invitado las aceptara.

CREATE POLICY workshop_members_update_owner ON workshop_members
  FOR UPDATE
  TO authenticated
  USING (auth_is_owner_in(workshop_id))
  WITH CHECK (auth_is_owner_in(workshop_id));

-- Sin DELETE. Desactivar = UPDATE status = 'inactive'.
```

**Trigger de protección**: aunque la policy de `UPDATE` deja al `owner` modificar membresías de su taller, el trigger `protect_workshop_member_update` le impide cambiar `user_id` o `workshop_id` y pasar una invitación de `invited` a `active` (solo `accept_invitation()` puede). Sí puede cancelar una invitación (`inactive`) y cambiar el rol entre `advisor` y `mechanic`.

**Nota**: un `owner` no puede degradarse a sí mismo si es el único owner. Esa validación va en un RPC, no en RLS.

---

## Referencias

- [README de policies](./README.md)
- [Decisiones transversales](../decisions.md)
- [Helpers](../helpers.md)
- [Tablas: Tenancy](../../data-model/tables/01-tenancy.md)

---

_Policies de Tenancy v1.1_
