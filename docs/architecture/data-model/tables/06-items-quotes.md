[← Índice de tablas](./README.md)

# Items y cotizaciones

### 19. `quotes`

Cotización. Una por iteración.

```sql
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
```

**UNIQUE**: `work_iteration_id`. Una cotización por iteración.

---

### 20. `quote_items`

Items de la cotización. Snapshot inmutable.

```sql
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
```

**Snapshot**: si el catálogo cambia, los items cotizados no cambian.

---

### 21. `repair_items`

Items de la reparación. Estado mutable.

```sql
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
```

---

### 22. `items_catalog`

Catálogo de items por taller.

```sql
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
```

---

### 23. `suppliers`

Proveedor.

```sql
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
```
