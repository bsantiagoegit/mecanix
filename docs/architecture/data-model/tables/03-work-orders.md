[← Índice de tablas](./README.md)

# Órdenes de trabajo

### 8. `work_orders`

Orden de trabajo.

```sql
CREATE TABLE work_orders (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id              uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  customer_id              uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  vehicle_id               uuid NOT NULL REFERENCES vehicles(id)  ON DELETE RESTRICT,
  advisor_id               uuid NOT NULL REFERENCES users(id)     ON DELETE RESTRICT,
  sequence_number          text NOT NULL,
  sequence_year            int  NOT NULL,
  sequence_number_annual   int  NOT NULL,
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
  )
);

CREATE UNIQUE INDEX idx_work_orders_sequence ON work_orders(workshop_id, sequence_year, sequence_number_annual);
CREATE INDEX idx_work_orders_workshop_status ON work_orders(workshop_id, status);
CREATE INDEX idx_work_orders_workshop_created ON work_orders(workshop_id, created_at DESC);
CREATE INDEX idx_work_orders_customer ON work_orders(customer_id);
CREATE INDEX idx_work_orders_vehicle ON work_orders(vehicle_id);
CREATE INDEX idx_work_orders_advisor ON work_orders(advisor_id);
```

**Numeración**: `sequence_number` (`OT-YYYY-NNNN`) se genera en un trigger al confirmar la recepción, no al crear el draft.

---

### 9. `vehicle_intakes`

Estado del vehículo al ingreso. 1:1 con `work_orders`.

```sql
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
```

---

### 10. `work_iterations`

Iteración de trabajo.

```sql
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
```

---

### 27. `work_order_status_history`

Auditoría de transiciones. Append-only.

```sql
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
```

**Append-only**: nunca `UPDATE` ni `DELETE`. Solo `INSERT` desde trigger o RPC.
