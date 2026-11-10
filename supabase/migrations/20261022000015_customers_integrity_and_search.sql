-- Clientes: integridad de los datos, soft delete solo del owner y búsqueda.
-- Fuente: docs/domain/use-cases/03-clientes.md, docs/architecture/security/decisions.md (D-RLS-13).

-- ---------------------------------------------------------------------------
-- 1. Normalización. La base de datos es la validación real (la interfaz se puede saltar):
--    recorta espacios, deja NULL los opcionales vacíos y guarda la identificación en mayúsculas.
--    Con eso el índice único (workshop_id, identification) ya no distingue mayúsculas
--    ("ab123" y "AB123" son el mismo pasaporte). Los triggers corren también para service_role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_customer()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.first_name     := btrim(NEW.first_name);
  NEW.last_name      := btrim(NEW.last_name);
  NEW.phone          := btrim(NEW.phone);
  NEW.email          := NULLIF(btrim(NEW.email), '');
  NEW.identification := NULLIF(upper(btrim(NEW.identification)), '');
  NEW.address        := NULLIF(btrim(NEW.address), '');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customers_normalize BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION normalize_customer();

-- Normaliza lo que ya existe antes de imponer las restricciones.
UPDATE customers SET first_name = first_name;

-- ---------------------------------------------------------------------------
-- 2. Restricciones de formato y largo (mismas reglas que el formulario).
--    Los CHECK se evalúan después de los triggers BEFORE, es decir, sobre el valor normalizado.
-- ---------------------------------------------------------------------------
ALTER TABLE customers
  ADD CONSTRAINT customers_first_name_valid CHECK (length(first_name) BETWEEN 1 AND 120),
  ADD CONSTRAINT customers_last_name_valid CHECK (length(last_name) BETWEEN 1 AND 120),
  ADD CONSTRAINT customers_phone_valid CHECK (phone ~ '^[0-9+()[:space:]-]{7,20}$'),
  ADD CONSTRAINT customers_email_valid CHECK (
    email IS NULL OR (length(email) <= 254 AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[A-Za-z]{2,}$')
  ),
  ADD CONSTRAINT customers_identification_valid CHECK (
    identification IS NULL OR length(identification) <= 20
  ),
  ADD CONSTRAINT customers_address_valid CHECK (address IS NULL OR length(address) <= 200);

-- ---------------------------------------------------------------------------
-- 3. Soft delete solo para el owner (customers y vehicles).
--    Eliminar = UPDATE deleted_at y RLS no distingue qué columna se cambia, así que la policy
--    de UPDATE (owner y advisor) también permitía borrar al advisor, contra la matriz de roles.
--    Aplica solo al rol authenticated; service_role y las funciones SECURITY DEFINER no pasan por aquí.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_soft_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     AND NOT auth_is_owner_in(OLD.workshop_id) THEN
    RAISE EXCEPTION 'only_owner_can_delete' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_customers_protect_soft_delete BEFORE UPDATE OF deleted_at ON customers
  FOR EACH ROW EXECUTE FUNCTION protect_soft_delete();

CREATE TRIGGER trg_vehicles_protect_soft_delete BEFORE UPDATE OF deleted_at ON vehicles
  FOR EACH ROW EXECUTE FUNCTION protect_soft_delete();

-- ---------------------------------------------------------------------------
-- 4. search_customers: búsqueda por nombre, teléfono o identificación (UC-CUST-02).
--
-- Una función en lugar de filtros `ilike` armados en el cliente: el texto del usuario viaja
-- como parámetro (sin inyección de filtros), se escapan % y _ y el límite está acotado.
-- Es SECURITY DEFINER porque aplica ella misma la regla de roles (D-RLS-12): el mechanic
-- solo busca por nombre y recibe teléfono, email e identificación en NULL.
--   - Cada palabra del texto debe coincidir (en cualquier campo permitido), sin distinguir
--     mayúsculas y en cualquier parte del campo. Máximo 5 palabras y 100 caracteres.
--   - Solo clientes no eliminados del taller indicado; si el usuario no es miembro activo
--     de ese taller devuelve cero filas.
--   - Orden estable por apellido, nombre e id; p_limit entre 1 y 100 (20 por defecto).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_customers(
  p_workshop_id uuid,
  p_query       text DEFAULT NULL,
  p_limit       int  DEFAULT 20,
  p_offset      int  DEFAULT 0
)
RETURNS TABLE (
  id             uuid,
  first_name     text,
  last_name      text,
  phone          text,
  email          text,
  identification text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_role   text;
  v_tokens text[];
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  v_role := auth_role_in(p_workshop_id);
  IF v_role IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(array_agg('%' || replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') || '%'), '{}')
    INTO v_tokens
    FROM (
      SELECT t
        FROM regexp_split_to_table(btrim(left(COALESCE(p_query, ''), 100)), '\s+') AS t
       WHERE t <> ''
       LIMIT 5
    ) s;

  RETURN QUERY
  SELECT c.id,
         c.first_name,
         c.last_name,
         CASE WHEN v_role = 'mechanic' THEN NULL ELSE c.phone END,
         CASE WHEN v_role = 'mechanic' THEN NULL ELSE c.email END,
         CASE WHEN v_role = 'mechanic' THEN NULL ELSE c.identification END
    FROM customers c
   WHERE c.workshop_id = p_workshop_id
     AND c.deleted_at IS NULL
     AND NOT EXISTS (
       SELECT 1
         FROM unnest(v_tokens) AS tok
        -- COALESCE: una identificación NULL no coincide. Sin él, NOT (... OR NULL) es NULL y la
        -- fila pasaría el filtro aunque la palabra no aparezca en ningún campo.
        WHERE NOT (
          c.first_name ILIKE tok
          OR c.last_name ILIKE tok
          OR (v_role <> 'mechanic'
              AND (c.phone ILIKE tok OR COALESCE(c.identification ILIKE tok, false)))
        )
     )
   ORDER BY c.last_name, c.first_name, c.id
   LIMIT least(greatest(COALESCE(p_limit, 20), 1), 100)
  OFFSET greatest(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION search_customers(uuid, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_customers(uuid, text, int, int) TO authenticated;
