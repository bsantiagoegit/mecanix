-- 01-tenancy: helpers RLS y policies.
-- Fuente: docs/architecture/security/helpers.md y policies/01-tenancy.md.

-- ---------------------------------------------------------------------------
-- Helpers SECURITY DEFINER (D-RLS-02). search_path fijo: obligatorio.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_workshop_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(workshop_id), ARRAY[]::uuid[])
    FROM workshop_members
   WHERE user_id = auth.uid()
     AND status = 'active';
$$;

CREATE OR REPLACE FUNCTION auth_role_in(p_workshop_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role
    FROM workshop_members
   WHERE user_id = auth.uid()
     AND workshop_id = p_workshop_id
     AND status = 'active'
   LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION auth_is_owner_in(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
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

CREATE OR REPLACE FUNCTION auth_is_advisor_or_owner_in(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
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

CREATE OR REPLACE FUNCTION auth_is_mechanic_in(p_workshop_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
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

-- ¿El usuario autenticado comparte algún taller (activo) con p_user_id?
-- Necesario para users_select_shared_workshop: un subquery directo sobre
-- workshop_members dentro de la policy está sujeto a la RLS de quien consulta,
-- y solo un owner vería las membresías de otros usuarios.
CREATE OR REPLACE FUNCTION auth_shares_workshop_with(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM workshop_members wm1
      JOIN workshop_members wm2 ON wm1.workshop_id = wm2.workshop_id
     WHERE wm1.user_id = auth.uid()
       AND wm2.user_id = p_user_id
       AND wm1.status = 'active'
       AND wm2.status = 'active'
  );
$$;

-- Solo usuarios autenticados evalúan los helpers (anon no necesita ninguno).
REVOKE ALL ON FUNCTION
  auth_workshop_ids(),
  auth_role_in(uuid),
  auth_is_owner_in(uuid),
  auth_is_advisor_or_owner_in(uuid),
  auth_is_mechanic_in(uuid),
  auth_shares_workshop_with(uuid)
FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION
  auth_workshop_ids(),
  auth_role_in(uuid),
  auth_is_owner_in(uuid),
  auth_is_advisor_or_owner_in(uuid),
  auth_is_mechanic_in(uuid),
  auth_shares_workshop_with(uuid)
TO authenticated;

-- ---------------------------------------------------------------------------
-- roles: lectura para autenticados; escritura solo por migración
-- ---------------------------------------------------------------------------
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY roles_select_authenticated ON roles
  FOR SELECT
  TO authenticated
  USING (true);

-- ---------------------------------------------------------------------------
-- workshops: ve el miembro, modifica el owner. INSERT solo service_role.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- users: propio perfil y el de quienes comparten taller. INSERT vía trigger.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- workshop_members: propias, o todas las de un taller si es owner (D-RLS-05).
-- Sin DELETE: desactivar = UPDATE status = 'inactive'.
-- ---------------------------------------------------------------------------
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
