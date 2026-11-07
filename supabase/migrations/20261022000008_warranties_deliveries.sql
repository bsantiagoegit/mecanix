-- 07-warranties-deliveries: tablas, trigger de garantía automática y policies.
-- Fuente: docs/architecture/data-model/tables/07-warranties-deliveries.md,
--         triggers.md y docs/architecture/security/policies/07-warranties-deliveries.md.

CREATE TABLE warranties (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id    uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  work_order_id  uuid NOT NULL UNIQUE REFERENCES work_orders(id) ON DELETE CASCADE,
  description    text NOT NULL,
  starts_at      timestamptz NOT NULL,
  expires_at     timestamptz NOT NULL,
  status         text NOT NULL DEFAULT 'active',
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT warranties_status_valid CHECK (status IN ('active', 'expired', 'claimed')),
  CONSTRAINT warranties_dates CHECK (expires_at > starts_at)
);

CREATE INDEX idx_warranties_workshop_status ON warranties(workshop_id, status);
CREATE INDEX idx_warranties_expires_at ON warranties(expires_at) WHERE status = 'active';

CREATE TABLE deliveries (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id                 uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  work_order_id               uuid NOT NULL UNIQUE REFERENCES work_orders(id) ON DELETE CASCADE,
  received_by_name            text NOT NULL,
  received_by_identification  text,
  notes                       text,
  delivered_at                timestamptz NOT NULL DEFAULT now(),
  created_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_workshop ON deliveries(workshop_id);

-- ---------------------------------------------------------------------------
-- Trigger: garantía automática al pasar a completed.
-- BEFORE UPDATE para poder fijar NEW.completed_at (en AFTER se ignoraría).
-- SECURITY DEFINER: warranties no tiene policy de INSERT para usuarios.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_warranty_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_warranty_days int;
BEGIN
  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN
    SELECT warranty_days INTO v_warranty_days
      FROM workshops WHERE id = NEW.workshop_id;

    INSERT INTO warranties (workshop_id, work_order_id, description, starts_at, expires_at)
    VALUES (
      NEW.workshop_id,
      NEW.id,
      'Garantía estándar por mano de obra y repuestos.',
      now(),
      now() + make_interval(days => v_warranty_days)
    );

    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_orders_warranty BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION create_warranty_on_completion();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE warranties ENABLE ROW LEVEL SECURITY;

CREATE POLICY warranties_select_member ON warranties
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY deliveries_select_member ON deliveries
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY deliveries_insert_advisor_owner ON deliveries
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));
