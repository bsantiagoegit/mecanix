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

**UNIQUE parcial**: `(workshop_id, identification)` solo cuando `identification IS NOT NULL` y `deleted_at IS NULL`. Como el trigger de normalización guarda la identificación en mayúsculas, la unicidad **no distingue mayúsculas** (`ab123` y `AB123` chocan).

**Sin UNIQUE en phone**: dos clientes pueden compartir teléfono.

**Normalización** (trigger `trg_customers_normalize`, `BEFORE INSERT OR UPDATE`): recorta espacios en todos los campos, deja `NULL` los opcionales vacíos (`email`, `identification`, `address`) y pone `identification` en mayúsculas. Corre también para `service_role`.

**Restricciones** (se evalúan sobre el valor ya normalizado; mismas reglas que el formulario, ver [UC de clientes](../../../domain/use-cases/03-clientes.md)):

| Constraint                       | Regla                                                                |
| -------------------------------- | -------------------------------------------------------------------- |
| `customers_first_name_valid`     | de 1 a 120 caracteres                                                |
| `customers_last_name_valid`      | de 1 a 120 caracteres                                                |
| `customers_phone_valid`          | de 7 a 20 caracteres: dígitos, espacios y `+ ( ) -`                  |
| `customers_email_valid`          | `NULL`, o formato `algo@dominio.ext` (extensión de 2+ letras), ≤ 254 |
| `customers_identification_valid` | `NULL`, o hasta 20 caracteres                                        |
| `customers_address_valid`        | `NULL`, o hasta 200 caracteres                                       |

**Soft delete solo del owner**: el trigger `trg_customers_protect_soft_delete` rechaza (`only_owner_can_delete`) que un `advisor` cambie `deleted_at`, al eliminar o al restaurar. Lo mismo en `vehicles` (`trg_vehicles_protect_soft_delete`). Ver [D-RLS-13](../../security/decisions.md).

**Búsqueda** (`search_customers`, UC-CUST-02): función `SECURITY DEFINER` y `STABLE`.

```sql
search_customers(p_workshop_id uuid, p_query text DEFAULT NULL, p_limit int DEFAULT 20, p_offset int DEFAULT 0)
RETURNS TABLE (id uuid, first_name text, last_name text, phone text, email text, identification text)
```

- Cada palabra del texto debe coincidir (`ILIKE '%palabra%'`) en el nombre, el apellido, el teléfono o la identificación; sin distinguir mayúsculas pero **sin ignorar tildes**. Máximo 5 palabras y 100 caracteres. `%` y `_` se tratan como texto.
- Solo clientes no eliminados de `p_workshop_id`. Si el usuario no es miembro activo de ese taller devuelve cero filas; sin sesión lanza `not_authenticated`; `anon` no puede ejecutarla.
- Orden estable por apellido, nombre e `id`. `p_limit` se acota entre 1 y 100 y `p_offset` a 0 como mínimo.
- **Mechanic**: solo busca por nombre y apellido, y recibe `phone`, `email` e `identification` en `NULL` ([D-RLS-12](../../security/decisions.md)). La función aplica esta regla ella misma porque corre con los permisos del propietario.
- Se usa una función en lugar de filtros `ilike` armados en el cliente para que el texto del usuario viaje como parámetro (sin inyección de filtros de PostgREST) y el límite esté acotado.
- Los índices actuales (`btree`) no aceleran `ILIKE '%…%'`: a la escala de un taller no importa; si hiciera falta se añade `pg_trgm`.

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
  key_code      text,
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

> **Nota sobre `key_code`**: la clave del vehículo (código numérico o alfanumérico para el inmovilizador). Nullable: solo se llena si `has_key = true`. Es del vehículo, no de la orden. Todos los roles activos del taller pueden verla (ver [D-DS-17](../../../design/decisions.md)).

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
