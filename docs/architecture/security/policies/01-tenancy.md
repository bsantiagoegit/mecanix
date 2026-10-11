[← Índice de policies](./README.md)

# Tenancy y usuarios

### `roles`

```sql
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_select_authenticated ON roles
  FOR SELECT TO authenticated USING (true);
```

### `workshops`

```sql
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;

CREATE POLICY workshops_select_member ON workshops
  FOR SELECT TO authenticated
  USING (id = ANY(auth_workshop_ids()));

CREATE POLICY workshops_update_owner ON workshops
  FOR UPDATE TO authenticated
  USING (auth_is_owner_in(id))
  WITH CHECK (auth_is_owner_in(id));
```

### `users`

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_self ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_select_shared_workshop ON users
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workshop_members wm1
        JOIN workshop_members wm2 ON wm1.workshop_id = wm2.workshop_id
       WHERE wm1.user_id = auth.uid()
         AND wm2.user_id = users.id
         AND wm1.status = 'active'
         AND wm2.status = 'active'
    )
  );

CREATE POLICY users_update_self ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());
```

### `workshop_members`

```sql
ALTER TABLE workshop_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY workshop_members_select_self ON workshop_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY workshop_members_select_owner ON workshop_members
  FOR SELECT TO authenticated
  USING (auth_is_owner_in(workshop_id));

CREATE POLICY workshop_members_insert_owner ON workshop_members
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_owner_in(workshop_id));

CREATE POLICY workshop_members_update_owner ON workshop_members
  FOR UPDATE TO authenticated
  USING (auth_is_owner_in(workshop_id))
  WITH CHECK (auth_is_owner_in(workshop_id));
```
