[← Índice de tablas](./README.md)

# Clientes y vehículos

### 5. `customers`

Cliente del taller.

```sql
CREATE TABLE customers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id    uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  phone          text NOT NULL,
  email          text,
  identification text,
  address        text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  deleted_at     timestamptz
);

CREATE INDEX idx_customers_workshop_active ON customers(workshop_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_name ON customers(workshop_id, last_name, first_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_phone ON customers(workshop_id, phone) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_customers_identification ON customers(workshop_id, identification)
  WHERE identification IS NOT NULL AND deleted_at IS NULL;
```

**UNIQUE parcial**: `(workshop_id, identification)` solo cuando `identification IS NOT NULL` y `deleted_at IS NULL`.

**Sin UNIQUE en phone**: dos clientes pueden compartir teléfono.

---

### 6. `vehicles`

Vehículo. Independiente del cliente.

```sql
CREATE TABLE vehicles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id   uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  license_plate text NOT NULL,
  make          text NOT NULL,
  model         text NOT NULL,
  year          int  NOT NULL,
  color         text,
  vin           text,
  transmission  text,
  has_key       boolean NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT vehicles_year_valid CHECK (year BETWEEN 1900 AND EXTRACT(YEAR FROM now())::int + 1),
  CONSTRAINT vehicles_transmission_valid CHECK (transmission IS NULL OR transmission IN ('manual', 'automatic', 'cvt', 'other'))
);

CREATE UNIQUE INDEX idx_vehicles_plate ON vehicles(workshop_id, license_plate)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_vin ON vehicles(workshop_id, vin)
  WHERE vin IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_vehicles_workshop_active ON vehicles(workshop_id) WHERE deleted_at IS NULL;
```

---

### 7. `vehicle_ownerships`

Relación temporal vehículo-cliente.

```sql
CREATE TABLE vehicle_ownerships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  vehicle_id  uuid NOT NULL REFERENCES vehicles(id)  ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  started_at  timestamptz NOT NULL DEFAULT now(),
  ended_at    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT vehicle_ownerships_dates CHECK (ended_at IS NULL OR ended_at > started_at)
);

CREATE UNIQUE INDEX idx_ownerships_active ON vehicle_ownerships(vehicle_id)
  WHERE ended_at IS NULL;
CREATE INDEX idx_ownerships_customer ON vehicle_ownerships(customer_id);
CREATE INDEX idx_ownerships_workshop ON vehicle_ownerships(workshop_id);
```

**UNIQUE parcial**: un vehículo tiene una sola ownership activa a la vez.
