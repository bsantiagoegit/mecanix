-- 04-inspections-diagnoses: tablas y policies.
-- Fuente: docs/architecture/data-model/tables/04-inspections-diagnoses.md y
--         docs/architecture/security/policies/04-inspections-diagnoses.md.

CREATE TABLE inspections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id       uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  work_iteration_id uuid NOT NULL REFERENCES work_iterations(id) ON DELETE CASCADE,
  mechanic_id       uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  notes             text,
  duration_minutes  int,
  started_at        timestamptz NOT NULL DEFAULT now(),
  completed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inspections_duration_positive CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  CONSTRAINT inspections_dates CHECK (completed_at IS NULL OR completed_at > started_at)
);

CREATE INDEX idx_inspections_iteration ON inspections(work_iteration_id);
CREATE INDEX idx_inspections_mechanic ON inspections(mechanic_id);
CREATE INDEX idx_inspections_workshop ON inspections(workshop_id);

CREATE TABLE findings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id    uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  inspection_id  uuid NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  created_by     uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  description    text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_findings_inspection ON findings(inspection_id);
CREATE INDEX idx_findings_workshop ON findings(workshop_id);

CREATE TRIGGER trg_findings_updated_at BEFORE UPDATE ON findings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE diagnoses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id   uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  finding_id    uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  created_by    uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  description   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_diagnoses_finding ON diagnoses(finding_id);
CREATE INDEX idx_diagnoses_workshop ON diagnoses(workshop_id);

CREATE TRIGGER trg_diagnoses_updated_at BEFORE UPDATE ON diagnoses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: cualquier miembro ve; solo mechanic crea y modifica.
-- ---------------------------------------------------------------------------
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY inspections_select_member ON inspections
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY inspections_insert_mechanic ON inspections
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND mechanic_id = auth.uid());

CREATE POLICY inspections_update_mechanic ON inspections
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_mechanic_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY findings_select_member ON findings
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY findings_insert_mechanic ON findings
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND created_by = auth.uid());

CREATE POLICY findings_update_mechanic ON findings
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_mechanic_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;

CREATE POLICY diagnoses_select_member ON diagnoses
  FOR SELECT TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY diagnoses_insert_mechanic ON diagnoses
  FOR INSERT TO authenticated
  WITH CHECK (auth_is_mechanic_in(workshop_id) AND created_by = auth.uid());

CREATE POLICY diagnoses_update_mechanic ON diagnoses
  FOR UPDATE TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_mechanic_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));
