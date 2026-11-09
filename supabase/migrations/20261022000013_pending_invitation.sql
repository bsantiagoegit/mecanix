-- ---------------------------------------------------------------------------
-- get_pending_invitation: qué taller y rol tiene la invitación pendiente del
-- propio usuario (UC-WS-04).
--
-- Un invitado aún no es miembro activo, así que la RLS no le deja leer el taller
-- (workshops_select_member exige membresía activa). Esta función le devuelve solo
-- el nombre del taller y su rol, y solo de su propia membresía `invited`.
-- Sin invitación pendiente (o sin sesión) devuelve cero filas.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_pending_invitation()
RETURNS TABLE (workshop_name text, role text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT w.name, wm.role
    FROM workshop_members wm
    JOIN workshops w ON w.id = wm.workshop_id
   WHERE wm.user_id = auth.uid()
     AND wm.status = 'invited'
     AND w.deleted_at IS NULL
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_pending_invitation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_pending_invitation() TO authenticated;
