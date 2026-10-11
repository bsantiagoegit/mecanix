[← Índice de tablas](./README.md)

# Inspecciones y diagnósticos

### 11. `inspections`

Inspección dentro de una iteración.

```sql
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
```

---

### 12. `findings`

Hallazgo.

```sql
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
```

---

### 13. `diagnoses`

Diagnóstico.

```sql
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
```
