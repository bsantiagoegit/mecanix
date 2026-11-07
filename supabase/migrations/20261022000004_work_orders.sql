-- 03-work-orders: tablas, triggers de numeración e historial, y policies.
-- Fuente: docs/architecture/data-model/tables/03-work-orders.md, triggers.md y
--         docs/architecture/security/policies/03-work-orders.md.

-- ---------------------------------------------------------------------------
-- 8. work_orders
-- La numeración (sequence_*) se asigna al pasar de draft a received (trigger),
-- por eso es nullable mientras la orden es borrador.
-- ---------------------------------------------------------------------------
CREATE TABLE work_orders (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id              uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  customer_id              uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id               uuid NOT NULL REFERENCES vehicles(id)  ON DELETE RESTRICT,
  advisor_id               uuid NOT NULL REFERENCES users(id)     ON DELETE RESTRICT,
  sequence_number          text,
  sequence_year            int,
  sequence_number_annual   int,
  status                   text NOT NULL DEFAULT 'draft',
  reported_problem         text NOT NULL,
  cancellation_reason      text,
  received_at              timestamptz,
  completed_at             timestamptz,
  delivered_at             timestamptz,
  cancelled_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_orders_status_valid CHECK (
    status IN ('draft', 'received', 'inspecting', 'awaiting_approval',
               'approved', 'in_progress', 'awaiting_parts', 'completed',
               'delivered', 'cancelled')
  ),
  CONSTRAINT work_orders_cancellation_reason CHECK (
    cancellation_reason IS NULL OR length(cancellation_reason) >= 10
  ),
  CONSTRAINT work_orders_cancelled_at CHECK (
    cancelled_at IS NULL OR status = 'cancelled'
  ),
  CONSTRAINT work_orders_delivered_at CHECK (
    delivered_at IS NULL OR status = 'delivered'
  ),
  CONSTRAINT work_orders_sequence_assigned CHECK (
    status = 'draft' OR sequence_number IS NOT NULL
  )
);

CREATE UNIQUE INDEX idx_work_orders_sequence ON work_orders(workshop_id, sequence_year, sequence_number_annual);
CREATE INDEX idx_work_orders_workshop_status ON work_orders(workshop_id, status);
CREATE INDEX idx_work_orders_workshop_created ON work_orders(workshop_id, created_at DESC);
CREATE INDEX idx_work_orders_customer ON work_orders(customer_id);
CREATE INDEX idx_work_orders_vehicle ON work_orders(vehicle_id);
CREATE INDEX idx_work_orders_advisor ON work_orders(advisor_id);

CREATE TRIGGER trg_work_orders_updated_at BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 9. vehicle_intakes (1:1 con work_orders)
-- ---------------------------------------------------------------------------
CREATE TABLE vehicle_intakes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id     uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  work_order_id   uuid NOT NULL UNIQUE REFERENCES work_orders(id) ON DELETE CASCADE,
  scratches       text,
  dents           text,
  tires_state     text,
  windows_state   text,
  belongings      text,
  general_notes   text,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_intakes_workshop ON vehicle_intakes(workshop_id);

-- ---------------------------------------------------------------------------
-- 10. work_iterations
-- ---------------------------------------------------------------------------
CREATE TABLE work_iterations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id       uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  work_order_id     uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  iteration_number  int  NOT NULL,
  status            text NOT NULL DEFAULT 'open',
  started_at        timestamptz NOT NULL DEFAULT now(),
  closed_at         timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT work_iterations_number_positive CHECK (iteration_number > 0),
  CONSTRAINT work_iterations_status_valid CHECK (
    status IN ('open', 'awaiting_approval', 'approved', 'rejected', 'completed')
  ),
  CONSTRAINT work_iterations_dates CHECK (closed_at IS NULL OR closed_at > started_at)
);

CREATE UNIQUE INDEX idx_iterations_order_number ON work_iterations(work_order_id, iteration_number);
CREATE INDEX idx_iterations_workshop ON work_iterations(workshop_id);

-- ---------------------------------------------------------------------------
-- 27. work_order_status_history (append-only; solo la puebla el trigger)
-- ---------------------------------------------------------------------------
CREATE TABLE work_order_status_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id  uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  actor_id       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  from_status    text,
  to_status      text NOT NULL,
  reason         text,
  metadata       jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT status_history_to_valid CHECK (
    to_status IN ('draft', 'received', 'inspecting', 'awaiting_approval',
                  'approved', 'in_progress', 'awaiting_parts', 'completed',
                  'delivered', 'cancelled')
  ),
  CONSTRAINT status_history_from_valid CHECK (
    from_status IS NULL OR from_status IN ('draft', 'received', 'inspecting',
                                            'awaiting_approval', 'approved',
                                            'in_progress', 'awaiting_parts',
                                            'completed', 'delivered', 'cancelled')
  )
);

CREATE INDEX idx_status_history_order ON work_order_status_history(work_order_id, created_at);
CREATE INDEX idx_status_history_actor ON work_order_status_history(actor_id);

-- ---------------------------------------------------------------------------
-- Trigger: numeración de orden (draft -> received).
-- El lock consultivo por taller+año evita que dos recepciones simultáneas
-- calculen el mismo número.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assign_work_order_sequence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM now())::int;
  v_next int;
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'received' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.workshop_id::text || ':' || v_year, 0));

    SELECT COALESCE(MAX(sequence_number_annual), 0) + 1
      INTO v_next
      FROM work_orders
     WHERE workshop_id = NEW.workshop_id
       AND sequence_year = v_year;

    NEW.sequence_year := v_year;
    NEW.sequence_number_annual := v_next;
    NEW.sequence_number := 'OT-' || v_year || '-' || LPAD(v_next::text, 4, '0');
    NEW.received_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_orders_sequence BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION assign_work_order_sequence();

-- ---------------------------------------------------------------------------
-- Trigger: historial de transiciones (cada cambio de status).
-- SECURITY DEFINER: el historial no tiene policy de INSERT.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION log_work_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO work_order_status_history (work_order_id, actor_id, from_status, to_status, reason)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, NEW.cancellation_reason);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_orders_status_history AFTER UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION log_work_order_status_change();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_orders_select_member ON work_orders
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY work_orders_insert_advisor_owner ON work_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_is_advisor_or_owner_in(workshop_id)
    AND status = 'draft'
    AND advisor_id = auth.uid()
  );

CREATE POLICY work_orders_update_member ON work_orders
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE vehicle_intakes ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_intakes_select_member ON vehicle_intakes
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY vehicle_intakes_insert_advisor_owner ON vehicle_intakes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

ALTER TABLE work_iterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY work_iterations_select_member ON work_iterations
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY work_iterations_insert_advisor_owner ON work_iterations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY work_iterations_update_member ON work_iterations
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE work_order_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY status_history_select_owner ON work_order_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_orders wo
       WHERE wo.id = work_order_status_history.work_order_id
         AND wo.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_owner_in(wo.workshop_id)
    )
  );
