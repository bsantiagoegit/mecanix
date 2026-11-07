-- 02-customers-vehicles: tablas, vista customers_public y policies.
-- Fuente: docs/architecture/data-model/tables/02-customers-vehicles.md,
--         docs/architecture/security/policies/02-customers-vehicles.md y views.md.

-- ---------------------------------------------------------------------------
-- 5. customers
-- ---------------------------------------------------------------------------
CREATE TABLE customers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id    uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  phone          text NOT NULL,
  email          text,
  identification text,
  address        text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

CREATE INDEX idx_customers_workshop_active ON customers(workshop_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_name ON customers(workshop_id, last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_phone ON customers(workshop_id, phone) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_customers_identification ON customers(workshop_id, identification)
  WHERE identification IS NOT NULL AND deleted_at IS NULL;

CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. vehicles
-- ---------------------------------------------------------------------------
CREATE TABLE vehicles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id   uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  license_plate text NOT NULL,
  make          text NOT NULL,
  model         text NOT NULL,
  year          int  NOT NULL,
  color         text,
  vin           text,
  transmission  text,
  has_key       boolean NOT NULL DEFAULT true,
  key_code      text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT vehicles_year_valid CHECK (year BETWEEN 1900 AND EXTRACT(YEAR FROM now())::int + 1),
  CONSTRAINT vehicles_transmission_valid CHECK (
    transmission IS NULL OR transmission IN ('manual', 'automatic', 'cvt', 'other')
  )
);

CREATE UNIQUE INDEX idx_vehicles_plate ON vehicles(workshop_id, license_plate)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_vin ON vehicles(workshop_id, vin)
  WHERE vin IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_vehicles_workshop_active ON vehicles(workshop_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. vehicle_ownerships
-- ---------------------------------------------------------------------------
CREATE TABLE vehicle_ownerships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  vehicle_id  uuid NOT NULL REFERENCES vehicles(id)  ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_ownerships_dates CHECK (ended_at IS NULL OR ended_at > started_at)
);

CREATE UNIQUE INDEX idx_ownerships_active ON vehicle_ownerships(vehicle_id)
  WHERE ended_at IS NULL;
CREATE INDEX idx_ownerships_customer ON vehicle_ownerships(customer_id);
CREATE INDEX idx_ownerships_workshop ON vehicle_ownerships(workshop_id);

-- ---------------------------------------------------------------------------
-- Vista customers_public: nombre sin datos de contacto (para mechanic).
-- security_invoker: la RLS de customers sigue aplicando.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW customers_public
WITH (security_invoker = true)
AS
SELECT
  id,
  workshop_id,
  first_name,
  last_name,
  created_at,
  updated_at,
  deleted_at
FROM customers;

-- ---------------------------------------------------------------------------
-- RLS
-- Las policies de SELECT NO filtran deleted_at: Postgres valida la fila nueva
-- de un UPDATE contra la policy de SELECT, así que un filtro `deleted_at IS NULL`
-- impediría el soft delete (UPDATE deleted_at). Los borrados se excluyen en las
-- consultas de la app (`.is('deleted_at', null)`).
-- ---------------------------------------------------------------------------
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select_member ON customers
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY customers_insert_advisor_owner ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY customers_update_advisor_owner ON customers
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicles_select_member ON vehicles
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY vehicles_insert_advisor_owner ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY vehicles_update_advisor_owner ON vehicles
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE vehicle_ownerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_ownerships_select_member ON vehicle_ownerships
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY vehicle_ownerships_insert_advisor_owner ON vehicle_ownerships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY vehicle_ownerships_update_advisor_owner ON vehicle_ownerships
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
