[← Índice de seguridad](./README.md)

# Funciones helper

```sql
-- Helper 1: talleres del usuario autenticado
CREATE OR REPLACE FUNCTION auth_workshop_ids()
RETURNS uuid[]
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(workshop_id), ARRAY[]::uuid[])
    FROM workshop_members
   WHERE user_id = auth.uid()
     AND status = 'active';
$$;

-- Helper 2: rol del usuario en un taller
CREATE OR REPLACE FUNCTION auth_role_in(p_workshop_id uuid)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT role FROM workshop_members
   WHERE user_id = auth.uid()
     AND workshop_id = p_workshop_id
     AND status = 'active'
   LIMIT 1;
$$;

-- Helper 3: ¿es owner?
CREATE OR REPLACE FUNCTION auth_is_owner_in(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workshop_members
     WHERE user_id = auth.uid()
       AND workshop_id = p_workshop_id
       AND role = 'owner'
       AND status = 'active'
  );
$$;

-- Helper 4: ¿es owner o advisor?
CREATE OR REPLACE FUNCTION auth_is_advisor_or_owner_in(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workshop_members
     WHERE user_id = auth.uid()
       AND workshop_id = p_workshop_id
       AND role IN ('owner', 'advisor')
       AND status = 'active'
  );
$$;

-- Helper 5: ¿es mechanic?
CREATE OR REPLACE FUNCTION auth_is_mechanic_in(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workshop_members
     WHERE user_id = auth.uid()
       AND workshop_id = p_workshop_id
       AND role = 'mechanic'
       AND status = 'active'
  );
$$;
```
