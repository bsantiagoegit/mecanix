-- 05-repairs: tablas y policies.
-- Fuente: docs/architecture/data-model/tables/05-repairs.md y
--         docs/architecture/security/policies/05-repairs.md.

CREATE TABLE recommended_repairs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id       uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  work_iteration_id uuid NOT NULL REFERENCES work_iterations(id) ON DELETE CASCADE,
  created_by        uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  description       text NOT NULL,
  estimated_cost    numeric(12,2) NOT NULL,
  estimated_minutes int,
  status            text NOT NULL DEFAULT 'recommended',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recommended_repairs_cost_non_negative CHECK (estimated_cost >= 0),
  CONSTRAINT recommended_repairs_minutes_positive CHECK (estimated_minutes IS NULL OR estimated_minutes > 0),
  CONSTRAINT recommended_repairs_status_valid CHECK (
    status IN ('recommended', 'approved', 'rejected', 'cancelled')
  )
);

CREATE INDEX idx_repairs_iteration ON recommended_repairs(work_iteration_id);
CREATE INDEX idx_repairs_status ON recommended_repairs(status);
CREATE INDEX idx_repairs_workshop ON recommended_repairs(workshop_id);

CREATE TRIGGER trg_recommended_repairs_updated_at BEFORE UPDATE ON recommended_repairs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE repair_findings (
  recommended_repair_id uuid NOT NULL REFERENCES recommended_repairs(id) ON DELETE CASCADE,
  finding_id            uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recommended_repair_id, finding_id)
);

CREATE INDEX idx_repair_findings_finding ON repair_findings(finding_id);

CREATE TABLE approvals (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id            uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  recommended_repair_id  uuid NOT NULL REFERENCES recommended_repairs(id) ON DELETE CASCADE,
  approved_by            uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decision               text NOT NULL,
  approved_amount        numeric(12,2),
  channel                text NOT NULL,
  notes                  text,
  decided_at             timestamptz NOT NULL DEFAULT now(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT approvals_decision_valid CHECK (decision IN ('approved', 'rejected')),
  CONSTRAINT approvals_channel_valid CHECK (channel IN ('in_person', 'phone', 'whatsapp', 'email')),
  CONSTRAINT approvals_amount_non_negative CHECK (approved_amount IS NULL OR approved_amount >= 0)
);

CREATE INDEX idx_approvals_repair_date ON approvals(recommended_repair_id, decided_at DESC);
CREATE INDEX idx_approvals_workshop ON approvals(workshop_id);

CREATE TABLE performed_repairs (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id            uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  recommended_repair_id  uuid NOT NULL REFERENCES recommended_repairs(id) ON DELETE RESTRICT,
  mechanic_id            uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes                  text,
  actual_cost            numeric(12,2),
  status                 text NOT NULL DEFAULT 'in_progress',
  started_at             timestamptz NOT NULL DEFAULT now(),
  completed_at           timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT performed_repairs_cost_non_negative CHECK (actual_cost IS NULL OR actual_cost >= 0),
  CONSTRAINT performed_repairs_status_valid CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  CONSTRAINT performed_repairs_dates CHECK (completed_at IS NULL OR completed_at > started_at)
);

CREATE INDEX idx_performed_repairs_recommended ON performed_repairs(recommended_repair_id);
CREATE INDEX idx_performed_repairs_mechanic ON performed_repairs(mechanic_id);
CREATE INDEX idx_performed_repairs_status ON performed_repairs(status);
CREATE INDEX idx_performed_repairs_workshop ON performed_repairs(workshop_id);

CREATE TABLE labor_entries (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id          uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  performed_repair_id  uuid NOT NULL REFERENCES performed_repairs(id) ON DELETE CASCADE,
  mechanic_id          uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  minutes              int NOT NULL,
  notes                text,
  worked_at            timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT labor_entries_minutes_valid CHECK (minutes > 0 AND minutes <= 1440)
);

CREATE INDEX idx_labor_entries_repair ON labor_entries(performed_repair_id);
CREATE INDEX idx_labor_entries_mechanic_date ON labor_entries(mechanic_id, worked_at DESC);
CREATE INDEX idx_labor_entries_workshop ON labor_entries(workshop_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE recommended_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY recommended_repairs_select_member ON recommended_repairs
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY recommended_repairs_insert_mechanic ON recommended_repairs
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND created_by = auth.uid());

CREATE POLICY recommended_repairs_update_member ON recommended_repairs
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE repair_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY repair_findings_select_member ON repair_findings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recommended_repairs rr
       WHERE rr.id = repair_findings.recommended_repair_id
         AND rr.workshop_id = ANY(auth_workshop_ids())
    )
  );

CREATE POLICY repair_findings_insert_mechanic ON repair_findings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recommended_repairs rr
       WHERE rr.id = repair_findings.recommended_repair_id
         AND rr.workshop_id = ANY(auth_workshop_ids())
         AND auth_is_mechanic_in(rr.workshop_id)
    )
  );

ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY approvals_select_member ON approvals
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY approvals_insert_advisor_owner ON approvals
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id) AND approved_by = auth.uid());

ALTER TABLE performed_repairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY performed_repairs_select_member ON performed_repairs
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY performed_repairs_insert_mechanic ON performed_repairs
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND mechanic_id = auth.uid());

CREATE POLICY performed_repairs_update_mechanic ON performed_repairs
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_mechanic_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE labor_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY labor_entries_select_member ON labor_entries
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY labor_entries_insert_mechanic ON labor_entries
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND mechanic_id = auth.uid());
