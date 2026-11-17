-- Vehículos: integridad de los datos, alta atómica con su propietario y búsqueda.
-- Fuente: docs/domain/use-cases/04-vehiculos.md (UC-VEH-01, 02 y 04).

-- ---------------------------------------------------------------------------
-- 1. Normalización. La base de datos es la validación real (la interfaz se puede saltar):
--    - recorta espacios y deja NULL los opcionales vacíos;
--    - la placa queda en mayúsculas y con guion ('pba1234' -> 'PBA-1234'), así que el índice
--      único (workshop_id, license_plate) ya no distingue mayúsculas ni guiones;
--    - el VIN queda en mayúsculas;
--    - sin clave (has_key = false) no puede haber key_code: se limpia solo (UC-VEH-04).
--    Los triggers corren también para service_role.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_vehicle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_plate text;
BEGIN
  -- Placa: sin espacios ni guiones para reconocer el formato y volver a ponerle el guion.
  v_plate := upper(regexp_replace(btrim(NEW.license_plate), '[[:space:]-]+', '', 'g'));
  IF v_plate ~ '^[A-Z]{3}[0-9]{3,4}$' THEN
    NEW.license_plate := substr(v_plate, 1, 3) || '-' || substr(v_plate, 4);
  ELSIF v_plate ~ '^[A-Z]{2}[0-9]{3}[A-Z]$' THEN
    NEW.license_plate := substr(v_plate, 1, 2) || '-' || substr(v_plate, 3);
  ELSE
    -- No es una placa reconocible: se deja recortada y el CHECK la rechaza.
    NEW.license_plate := upper(btrim(NEW.license_plate));
  END IF;

  NEW.make         := btrim(NEW.make);
  NEW.model        := btrim(NEW.model);
  NEW.color        := NULLIF(btrim(NEW.color), '');
  NEW.vin          := NULLIF(upper(btrim(NEW.vin)), '');
  NEW.transmission := NULLIF(btrim(NEW.transmission), '');
  NEW.notes        := NULLIF(btrim(NEW.notes), '');
  NEW.key_code     := CASE WHEN NEW.has_key THEN NULLIF(btrim(NEW.key_code), '') ELSE NULL END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vehicles_normalize BEFORE INSERT OR UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION normalize_vehicle();

-- Normaliza lo que ya existe antes de imponer las restricciones.
-- Un vehículo con has_key = true y sin key_code (la columna era opcional) pasa a "sin clave":
-- no hay forma de inventar la clave, y la interfaz de vehículos todavía no existía, así que
-- solo pueden ser los datos de demostración.
UPDATE vehicles SET has_key = false WHERE has_key AND (key_code IS NULL OR btrim(key_code) = '');
UPDATE vehicles SET make = make;

-- ---------------------------------------------------------------------------
-- 2. Restricciones de formato y largo (mismas reglas que el formulario).
--    Los CHECK se evalúan después de los triggers BEFORE, es decir, sobre el valor normalizado.
--    Placa ecuatoriana: autos ABC-1234 y ABC-123 (formato antiguo), motos AB-123C.
--    VIN: 17 caracteres sin I, O ni Q (ISO 3779); solo el formato, no el dígito verificador.
-- ---------------------------------------------------------------------------
ALTER TABLE vehicles
  ADD CONSTRAINT vehicles_license_plate_valid CHECK (
    license_plate ~ '^([A-Z]{3}-[0-9]{3,4}|[A-Z]{2}-[0-9]{3}[A-Z])$'
  ),
  ADD CONSTRAINT vehicles_make_valid CHECK (length(make) BETWEEN 1 AND 60),
  ADD CONSTRAINT vehicles_model_valid CHECK (length(model) BETWEEN 1 AND 60),
  ADD CONSTRAINT vehicles_color_valid CHECK (color IS NULL OR length(color) <= 30),
  ADD CONSTRAINT vehicles_vin_valid CHECK (vin IS NULL OR vin ~ '^[A-HJ-NPR-Z0-9]{17}$'),
  ADD CONSTRAINT vehicles_notes_valid CHECK (notes IS NULL OR length(notes) <= 500),
  ADD CONSTRAINT vehicles_key_code_valid CHECK (key_code IS NULL OR length(key_code) <= 50),
  -- La clave es obligatoria exactamente cuando el vehículo tiene clave.
  ADD CONSTRAINT vehicles_key_code_matches_has_key CHECK (has_key = (key_code IS NOT NULL));

-- ---------------------------------------------------------------------------
-- 3. create_vehicle: alta atómica del vehículo y su propietario (UC-VEH-01).
--
-- Un vehículo sin propietario no tiene sentido para el taller, y hacer dos llamadas desde la
-- aplicación dejaría un vehículo huérfano si la segunda falla. Es SECURITY INVOKER: las policies
-- de RLS siguen aplicando (solo owner y advisor insertan) y la clave foránea compuesta
-- (workshop_id, customer_id) impide enlazar un cliente de otro taller.
-- Errores: not_authenticated y insufficient_privilege (42501), customer_not_found (P0002);
-- una placa repetida lanza la violación de unicidad de idx_vehicles_plate (23505).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_vehicle(
  p_workshop_id   uuid,
  p_customer_id   uuid,
  p_license_plate text,
  p_make          text,
  p_model         text,
  p_year          int,
  p_color         text    DEFAULT NULL,
  p_vin           text    DEFAULT NULL,
  p_transmission  text    DEFAULT NULL,
  p_has_key       boolean DEFAULT true,
  p_key_code      text    DEFAULT NULL,
  p_notes         text    DEFAULT NULL
)
RETURNS vehicles
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_vehicle vehicles;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT auth_is_advisor_or_owner_in(p_workshop_id) THEN
    RAISE EXCEPTION 'insufficient_privilege' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1
      FROM customers c
     WHERE c.id = p_customer_id
       AND c.workshop_id = p_workshop_id
       AND c.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'customer_not_found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO vehicles (
    workshop_id, license_plate, make, model, year, color, vin, transmission, has_key, key_code, notes
  ) VALUES (
    p_workshop_id, p_license_plate, p_make, p_model, p_year, p_color, p_vin, p_transmission,
    p_has_key, p_key_code, p_notes
  )
  RETURNING * INTO v_vehicle;

  INSERT INTO vehicle_ownerships (workshop_id, vehicle_id, customer_id)
  VALUES (p_workshop_id, v_vehicle.id, p_customer_id);

  RETURN v_vehicle;
END;
$$;

REVOKE ALL ON FUNCTION create_vehicle(uuid, uuid, text, text, text, int, text, text, text, boolean, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION create_vehicle(uuid, uuid, text, text, text, int, text, text, text, boolean, text, text)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. search_vehicles: búsqueda por placa o VIN (UC-VEH-02), con el propietario actual.
--
-- Una función en lugar de filtros `ilike` armados en el cliente: el texto del usuario viaja
-- como parámetro, se escapan % y _ y el límite está acotado. Además une el propietario, que
-- el mechanic solo puede leer por nombre (customers_public).
-- Es SECURITY INVOKER: RLS decide qué vehículos y propiedades ve cada usuario; no hace falta
-- saltarse nada, porque todos los roles ven los vehículos y el nombre del propietario.
--   - El texto se compara sin espacios ni guiones ('pba 12' encuentra 'PBA-1234'), sin distinguir
--     mayúsculas y en cualquier parte de la placa o del VIN. Máximo 50 caracteres.
--   - Sin texto devuelve todos los vehículos no eliminados del taller.
--   - Un vehículo sin propietario actual sale con el propietario en NULL.
--   - Orden estable por placa e id; p_limit entre 1 y 100 (20 por defecto).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION search_vehicles(
  p_workshop_id uuid,
  p_query       text DEFAULT NULL,
  p_limit       int  DEFAULT 20,
  p_offset      int  DEFAULT 0
)
RETURNS TABLE (
  id               uuid,
  license_plate    text,
  make             text,
  model            text,
  year             int,
  vin              text,
  has_key          boolean,
  key_code         text,
  owner_id         uuid,
  owner_first_name text,
  owner_last_name  text
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_needle text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  v_needle := regexp_replace(upper(left(COALESCE(p_query, ''), 50)), '[[:space:]-]+', '', 'g');
  v_needle := CASE
    WHEN v_needle = '' THEN NULL
    ELSE '%' || replace(replace(replace(v_needle, '\', '\\'), '%', '\%'), '_', '\_') || '%'
  END;

  RETURN QUERY
  SELECT v.id,
         v.license_plate,
         v.make,
         v.model,
         v.year,
         v.vin,
         v.has_key,
         v.key_code,
         c.id,
         c.first_name,
         c.last_name
    FROM vehicles v
    LEFT JOIN vehicle_ownerships o
           ON o.vehicle_id = v.id AND o.workshop_id = v.workshop_id AND o.ended_at IS NULL
    LEFT JOIN customers_public c
           ON c.id = o.customer_id AND c.deleted_at IS NULL
   WHERE v.workshop_id = p_workshop_id
     AND v.deleted_at IS NULL
     AND (
       v_needle IS NULL
       OR replace(v.license_plate, '-', '') ILIKE v_needle
       OR COALESCE(v.vin ILIKE v_needle, false)
     )
   ORDER BY v.license_plate, v.id
   LIMIT least(greatest(COALESCE(p_limit, 20), 1), 100)
  OFFSET greatest(COALESCE(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION search_vehicles(uuid, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION search_vehicles(uuid, text, int, int) TO authenticated;
