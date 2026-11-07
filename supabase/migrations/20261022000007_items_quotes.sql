-- 06-items-quotes: tablas y policies.
-- Fuente: docs/architecture/data-model/tables/06-items-quotes.md y
--         docs/architecture/security/policies/06-items-quotes.md.

-- items_catalog y suppliers primero: quote_items y repair_items los referencian.
CREATE TABLE items_catalog (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id   uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  type          text NOT NULL,
  name          text NOT NULL,
  code          text,
  default_cost  numeric(12,2),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT items_catalog_type_valid CHECK (type IN ('part', 'supply')),
  CONSTRAINT items_catalog_default_cost_non_negative CHECK (default_cost IS NULL OR default_cost >= 0)
);

CREATE UNIQUE INDEX idx_items_catalog_unique ON items_catalog(workshop_id, type, name);
CREATE INDEX idx_items_catalog_search ON items_catalog(workshop_id, name);

CREATE TRIGGER trg_items_catalog_updated_at BEFORE UPDATE ON items_catalog
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE suppliers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id   uuid NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
  name          text NOT NULL,
  phone         text,
  contact_name  text,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_suppliers_unique ON suppliers(workshop_id, name);
CREATE INDEX idx_suppliers_workshop ON suppliers(workshop_id);

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE quotes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id       uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  work_iteration_id uuid NOT NULL UNIQUE REFERENCES work_iterations(id) ON DELETE CASCADE,
  created_by        uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status            text NOT NULL DEFAULT 'draft',
  total_amount      numeric(12,2) NOT NULL DEFAULT 0,
  sent_at           timestamptz,
  expires_at        timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotes_status_valid CHECK (
    status IN ('draft', 'sent', 'partially_approved', 'approved', 'rejected', 'expired')
  ),
  CONSTRAINT quotes_total_non_negative CHECK (total_amount >= 0),
  CONSTRAINT quotes_dates CHECK (expires_at > created_at)
);

CREATE INDEX idx_quotes_workshop_status ON quotes(workshop_id, status);
CREATE INDEX idx_quotes_expires_at ON quotes(expires_at) WHERE status IN ('sent', 'partially_approved');

CREATE TRIGGER trg_quotes_updated_at BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE quote_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id         uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  item_catalog_id  uuid REFERENCES items_catalog(id) ON DELETE SET NULL,
  type             text NOT NULL,
  name             text NOT NULL,
  quantity         numeric(10,2) NOT NULL,
  unit_cost        numeric(12,2) NOT NULL,
  total_cost       numeric(12,2) NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_items_type_valid CHECK (type IN ('part', 'supply')),
  CONSTRAINT quote_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT quote_items_unit_cost_non_negative CHECK (unit_cost >= 0),
  CONSTRAINT quote_items_total_cost_non_negative CHECK (total_cost >= 0)
);

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

CREATE TABLE repair_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id            uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  recommended_repair_id  uuid NOT NULL REFERENCES recommended_repairs(id) ON DELETE CASCADE,
  item_catalog_id        uuid REFERENCES items_catalog(id) ON DELETE SET NULL,
  supplier_id            uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  type                   text NOT NULL,
  name                   text NOT NULL,
  quantity               numeric(10,2) NOT NULL,
  estimated_cost         numeric(12,2) NOT NULL,
  actual_cost            numeric(12,2),
  status                 text NOT NULL DEFAULT 'pending',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT repair_items_type_valid CHECK (type IN ('part', 'supply')),
  CONSTRAINT repair_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT repair_items_estimated_cost_non_negative CHECK (estimated_cost >= 0),
  CONSTRAINT repair_items_actual_cost_non_negative CHECK (actual_cost IS NULL OR actual_cost >= 0),
  CONSTRAINT repair_items_status_valid CHECK (
    status IN ('requested', 'received', 'installed', 'returned', 'pending', 'cancelled')
  )
);

CREATE INDEX idx_repair_items_repair ON repair_items(recommended_repair_id);
CREATE INDEX idx_repair_items_status ON repair_items(status);
CREATE INDEX idx_repair_items_supplier ON repair_items(supplier_id);
CREATE INDEX idx_repair_items_workshop ON repair_items(workshop_id);

CREATE TRIGGER trg_repair_items_updated_at BEFORE UPDATE ON repair_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY quotes_select_advisor_owner ON quotes
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY quotes_insert_advisor_owner ON quotes
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id) AND created_by = auth.uid());

CREATE POLICY quotes_update_advisor_owner ON quotes
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY quote_items_select_advisor_owner ON quote_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
       WHERE q.id = quote_items.quote_id
         AND q.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_advisor_or_owner_in(q.workshop_id)
    )
  );

CREATE POLICY quote_items_insert_advisor_owner ON quote_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM quotes q
       WHERE q.id = quote_items.quote_id
         AND q.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_advisor_or_owner_in(q.workshop_id)
    )
  );

CREATE POLICY quote_items_update_advisor_owner ON quote_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
       WHERE q.id = quote_items.quote_id
         AND q.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_advisor_or_owner_in(q.workshop_id)
    )
  );

CREATE POLICY quote_items_delete_advisor_owner ON quote_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotes q
       WHERE q.id = quote_items.quote_id
         AND q.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_advisor_or_owner_in(q.workshop_id)
    )
  );

ALTER TABLE repair_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY repair_items_select_member ON repair_items
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY repair_items_insert_member ON repair_items
  FOR INSERT TO authenticated
  WITH CHECK (
    workshop_id = ANY(auth_workshop_ids())
    AND (auth_is_mechanic_in(workshop_id) OR auth_is_advisor_or_owner_in(workshop_id))
  );

CREATE POLICY repair_items_update_member ON repair_items
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE items_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY items_catalog_select_member ON items_catalog
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY items_catalog_insert_advisor_owner ON items_catalog
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY items_catalog_update_advisor_owner ON items_catalog
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY items_catalog_delete_advisor_owner ON items_catalog
  FOR DELETE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id));

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select_member ON suppliers
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY suppliers_insert_advisor_owner ON suppliers
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY suppliers_update_advisor_owner ON suppliers
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY suppliers_delete_advisor_owner ON suppliers
  FOR DELETE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id));
