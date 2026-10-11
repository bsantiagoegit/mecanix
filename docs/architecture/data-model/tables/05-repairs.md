[← Índice de tablas](./README.md)

# Reparaciones

### 14. `recommended_repairs`

Reparación recomendada.

```sql
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
```

---

### 15. `repair_findings`

Tabla intermedia N:M entre reparaciones y hallazgos.

```sql
CREATE TABLE repair_findings (
  recommended_repair_id uuid NOT NULL REFERENCES recommended_repairs(id) ON DELETE CASCADE,
  finding_id            uuid NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (recommended_repair_id, finding_id)
);

CREATE INDEX idx_repair_findings_finding ON repair_findings(finding_id);
```

---

### 16. `approvals`

Aprobación/rechazo por reparación individual.

```sql
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
```

**Histórico**: se pueden insertar múltiples approvals por repair. El estado actual se deriva del último.

---

### 17. `performed_repairs`

Reparación realizada.

```sql
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
```

---

### 18. `labor_entries`

Registro de tiempo por mecánico.

```sql
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
```

**CHECK**: máximo 24h (1440 min) por entrada.
