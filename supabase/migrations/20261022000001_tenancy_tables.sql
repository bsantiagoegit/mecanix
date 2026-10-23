-- 01-tenancy: tablas, triggers de updated_at y espejo de auth.users.
-- Fuente: docs/architecture/data-model/tables/01-tenancy.md y triggers.md.

-- ---------------------------------------------------------------------------
-- Trigger genérico: updated_at automático
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 1. roles (catálogo cerrado, global)
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL
);

INSERT INTO roles (code, name, description) VALUES
  ('owner',    'Dueño',    'Administrador del taller. Acceso total.'),
  ('advisor',  'Asesor',   'Atiende clientes, cotiza, gestiona aprobaciones.'),
  ('mechanic', 'Mecánico', 'Inspecciona, diagnostica, repara.');

-- ---------------------------------------------------------------------------
-- 2. workshops (unidad de aislamiento multi-tenant)
-- ---------------------------------------------------------------------------
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

CREATE TRIGGER trg_workshops_updated_at BEFORE UPDATE ON workshops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. users (espejo de auth.users con metadata adicional)
-- ---------------------------------------------------------------------------
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

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. workshop_members (usuario-taller con rol)
-- ---------------------------------------------------------------------------
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

CREATE TRIGGER trg_workshop_members_updated_at BEFORE UPDATE ON workshop_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger: crear la fila de users cuando se crea un usuario en auth.users
-- (users no tiene policy de INSERT: solo este trigger la puebla)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO users (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''), split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_users_create_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();
