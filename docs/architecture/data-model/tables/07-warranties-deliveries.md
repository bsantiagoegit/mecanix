[← Índice de tablas](./README.md)

# Garantías y entregas

### 24. `warranties`

Garantía. 1:1 con `work_orders`.

```sql
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
```

---

### 25. `deliveries`

Entrega del vehículo. 1:1 con `work_orders`.

```sql
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
```
