-- Onboarding de taller: un taller por cuenta, un owner por taller, create_workshop y
-- accept_invitation, y cierre de la inserción directa de membresías.
-- Fuente: docs/architecture/adr/ADR-012 y ADR-013, docs/architecture/multi-tenant/workshop-onboarding.md.

-- ---------------------------------------------------------------------------
-- Un taller por cuenta y un solo owner por taller (ADR-012)
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX idx_workshop_members_one_workshop ON workshop_members(user_id)
  WHERE status IN ('active', 'invited');

CREATE UNIQUE INDEX idx_workshop_members_one_owner ON workshop_members(workshop_id)
  WHERE role = 'owner' AND status <> 'inactive';

-- ---------------------------------------------------------------------------
-- Nadie inserta membresías desde el cliente: solo create_workshop(), la Edge Function
-- invite-user (service_role) y accept_invitation().
-- ---------------------------------------------------------------------------
DROP POLICY workshop_members_insert_owner ON workshop_members;

-- ---------------------------------------------------------------------------
-- Protección de UPDATE para el rol authenticated (el owner puede actualizar membresías):
--  - no puede mover una membresía a otro usuario o taller;
--  - no puede activar una invitación: invited -> active solo lo hace accept_invitation().
-- Dentro de las funciones SECURITY DEFINER current_user no es 'authenticated'.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_workshop_member_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.user_id <> OLD.user_id OR NEW.workshop_id <> OLD.workshop_id THEN
      RAISE EXCEPTION 'workshop_member_identity_immutable' USING ERRCODE = '42501';
    END IF;
    IF OLD.status = 'invited' AND NEW.status = 'active' THEN
      RAISE EXCEPTION 'invitation_must_be_accepted_by_invitee' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_workshop_members_protect BEFORE UPDATE ON workshop_members
  FOR EACH ROW EXECUTE FUNCTION protect_workshop_member_update();

-- ---------------------------------------------------------------------------
-- create_workshop: crea el taller y la membresía owner del usuario autenticado,
-- en una sola transacción. Errores (message): not_authenticated, email_not_confirmed,
-- invalid_workshop_data, user_already_has_workshop.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_workshop(p_name text, p_address text, p_phone text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid := auth.uid();
  v_workshop_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = v_user_id AND email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'email_not_confirmed' USING ERRCODE = '42501';
  END IF;

  IF length(btrim(COALESCE(p_name, ''))) = 0
     OR length(btrim(COALESCE(p_address, ''))) = 0
     OR length(btrim(COALESCE(p_phone, ''))) = 0 THEN
    RAISE EXCEPTION 'invalid_workshop_data' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM workshop_members
     WHERE user_id = v_user_id AND status IN ('active', 'invited')
  ) THEN
    RAISE EXCEPTION 'user_already_has_workshop' USING ERRCODE = '23505';
  END IF;

  INSERT INTO workshops (name, address, phone)
  VALUES (btrim(p_name), btrim(p_address), btrim(p_phone))
  RETURNING id INTO v_workshop_id;

  INSERT INTO workshop_members (workshop_id, user_id, role, status, joined_at)
  VALUES (v_workshop_id, v_user_id, 'owner', 'active', now());

  RETURN v_workshop_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- accept_invitation: activa la membresía 'invited' del propio usuario y devuelve el taller.
-- Errores (message): not_authenticated, no_pending_invitation.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION accept_invitation()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_workshop_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  UPDATE workshop_members
     SET status = 'active', joined_at = now()
   WHERE user_id = auth.uid() AND status = 'invited'
  RETURNING workshop_id INTO v_workshop_id;

  IF v_workshop_id IS NULL THEN
    RAISE EXCEPTION 'no_pending_invitation' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_workshop_id;
END;
$$;

-- Solo usuarios autenticados las ejecutan.
REVOKE ALL ON FUNCTION create_workshop(text, text, text), accept_invitation()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_workshop(text, text, text), accept_invitation()
  TO authenticated;
