-- ---------------------------------------------------------------------------
-- El owner ve el perfil de quienes invitó (UC-WS-03).
--
-- users_select_shared_workshop exige que ambos estén `active`, así que el owner
-- no vería nombre, correo ni teléfono de una persona con membresía `invited`.
-- Esta policy lo cubre solo para el owner del taller que invitó; desaparece
-- cuando la invitación se acepta (entonces aplica la policy de taller compartido)
-- o se cancela (`inactive`).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_owner_invited(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM workshop_members wm
     WHERE wm.user_id = p_user_id
       AND wm.status = 'invited'
       AND auth_is_owner_in(wm.workshop_id)
  );
$$;

REVOKE ALL ON FUNCTION auth_owner_invited(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION auth_owner_invited(uuid) TO authenticated;

CREATE POLICY users_select_invited_by_owner ON users
  FOR SELECT
  TO authenticated
  USING (auth_owner_invited(id));
