[← Índice de tablas](./README.md)

# Tenancy y usuarios

### 1. `roles`

Catálogo cerrado de roles. No editable por el taller.

```sql
CREATE TABLE roles (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL
);

INSERT INTO roles (code, name, description) VALUES
  ('owner',    'Dueño',    'Administrador del taller. Acceso total.'),
  ('advisor',  'Asesor',   'Atiende clientes, cotiza, gestiona aprobaciones.'),
  ('mechanic', 'Mecánico', 'Inspecciona, diagnostica, repara.');
```

**Sin `workshop_id`**: es global.

---

### 2. `workshops`

Taller. Unidad de aislamiento multi-tenant.

```sql
CREATE TABLE workshops (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  text NOT NULL,
  address               text NOT NULL,
  phone                 text NOT NULL,
  logo_url              text,
  capacity              int  NOT NULL DEFAULT 4,
  min_intake_photos     int  NOT NULL DEFAULT 4,
  quote_expiration_days int  NOT NULL DEFAULT 7,
  warranty_days         int  NOT NULL DEFAULT 14,
  currency              char(3) NOT NULL DEFAULT 'USD',
  timezone              text NOT NULL DEFAULT 'America/Guayaquil',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  CONSTRAINT workshops_capacity_positive CHECK (capacity > 0),
  CONSTRAINT workshops_min_photos_positive CHECK (min_intake_photos >= 1),
  CONSTRAINT workshops_quote_days_positive CHECK (quote_expiration_days > 0),
  CONSTRAINT workshops_warranty_days_positive CHECK (warranty_days > 0),
  CONSTRAINT workshops_currency_iso CHECK (currency ~ '^[A-Z]{3}$')
);

CREATE INDEX idx_workshops_deleted_at ON workshops(deleted_at) WHERE deleted_at IS NULL;
```

---

### 3. `users`

Espejo de `auth.users` con metadata adicional.

```sql
CREATE TABLE users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL UNIQUE,
  full_name     text NOT NULL,
  phone         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE INDEX idx_users_email ON users(email);
```

**Nota**: `id` referencia `auth.users.id`. Supabase Auth gestiona el password.

---

### 4. `workshop_members`

Relación usuario-taller con rol.

```sql
CREATE TABLE workshop_members (
  workshop_id uuid NOT NULL REFERENCES workshops(id) ON DELETE RESTRICT,
  user_id     uuid NOT NULL REFERENCES users(id)     ON DELETE CASCADE,
  role        text NOT NULL REFERENCES roles(code)   ON DELETE RESTRICT,
  status      text NOT NULL DEFAULT 'active',
  invited_at  timestamptz NOT NULL DEFAULT now(),
  joined_at   timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workshop_id, user_id),
  CONSTRAINT workshop_members_role_valid CHECK (role IN ('owner', 'advisor', 'mechanic')),
  CONSTRAINT workshop_members_status_valid CHECK (status IN ('active', 'inactive', 'invited'))
);

CREATE INDEX idx_workshop_members_user ON workshop_members(user_id);
CREATE INDEX idx_workshop_members_workshop ON workshop_members(workshop_id);
```
