[← Índice del modelo relacional](./README.md)

# Triggers

## Trigger: `updated_at` automático

Aplicar a todas las tablas con `updated_at`.

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a cada tabla con updated_at
CREATE TRIGGER trg_workshops_updated_at BEFORE UPDATE ON workshops
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
-- ... (repetir para: users, workshop_members, customers, vehicles,
--      work_orders, findings, diagnoses, recommended_repairs, quotes,
--      repair_items, items_catalog, suppliers)
```

## Trigger: perfil de usuario (`handle_new_auth_user`)

Se dispara al crearse un usuario en `auth.users` y crea su fila en `users`. Es la única forma de poblar `users` (no tiene policy de INSERT).

```sql
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
```

**`full_name`**: `NOT NULL`. Se toma de `raw_user_meta_data.full_name`; si no viene, se usa la parte local del email.

## Trigger: numeración de orden

Se dispara al pasar de `draft` a `received`.

```sql
CREATE OR REPLACE FUNCTION assign_work_order_sequence()
RETURNS trigger AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM now())::int;
  v_next int;
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'received' THEN
    -- Lock por taller y año: dos recepciones simultáneas no calculan el mismo número.
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.workshop_id::text || ':' || v_year, 0));

    SELECT COALESCE(MAX(sequence_number_annual), 0) + 1
      INTO v_next
      FROM work_orders
      WHERE workshop_id = NEW.workshop_id
        AND sequence_year = v_year;
    NEW.sequence_year := v_year;
    NEW.sequence_number_annual := v_next;
    NEW.sequence_number := 'OT-' || v_year || '-' || LPAD(v_next::text, 4, '0');
    NEW.received_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_work_orders_sequence BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION assign_work_order_sequence();
```

## Trigger: historial de transiciones

Se dispara en cada cambio de `status`.

```sql
CREATE OR REPLACE FUNCTION log_work_order_status_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO work_order_status_history (work_order_id, actor_id, from_status, to_status, reason)
    VALUES (NEW.id, auth.uid(), OLD.status, NEW.status, NEW.cancellation_reason);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_work_orders_status_history AFTER UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION log_work_order_status_change();
```

**Nota**: `auth.uid()` es la función de Supabase que devuelve el UUID del usuario autenticado.

## Trigger: garantía automática

Se dispara al pasar a `completed`. Es **`BEFORE UPDATE`** (no `AFTER`): necesita fijar `NEW.completed_at`, y en un trigger `AFTER` ese cambio se descarta. Es **`SECURITY DEFINER`** porque `warranties` no tiene policy de INSERT para usuarios.

```sql
CREATE OR REPLACE FUNCTION create_warranty_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_warranty_days int;
BEGIN
  IF OLD.status IS DISTINCT FROM 'completed' AND NEW.status = 'completed' THEN
    SELECT warranty_days INTO v_warranty_days
      FROM workshops WHERE id = NEW.workshop_id;

    INSERT INTO warranties (workshop_id, work_order_id, description, starts_at, expires_at)
    VALUES (
      NEW.workshop_id,
      NEW.id,
      'Garantía estándar por mano de obra y repuestos.',
      now(),
      now() + make_interval(days => v_warranty_days)
    );

    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_work_orders_warranty BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION create_warranty_on_completion();
```

## Notas

- `log_work_order_status_change()` usa `auth.uid()` como `actor_id` (NOT NULL). Un `UPDATE` de `status` sin usuario autenticado (p. ej. con `service_role` o desde una migración) falla; quien actúe así debe fijar el usuario antes (`set_config('request.jwt.claim.sub', ...)`).
- Los triggers `BEFORE UPDATE` de `work_orders` son `updated_at`, numeración y garantía; el de historial es `AFTER UPDATE`.

## Triggers de clientes y soft delete

- `normalize_customer()` (`trg_customers_normalize`, `BEFORE INSERT OR UPDATE` en `customers`): recorta espacios, deja `NULL` los opcionales vacíos y guarda `identification` en mayúsculas. Ver [clientes](./tables/02-customers-vehicles.md).
- `protect_soft_delete()` (`trg_customers_protect_soft_delete` y `trg_vehicles_protect_soft_delete`, `BEFORE UPDATE OF deleted_at`): solo el `owner` del taller puede cambiar `deleted_at` (eliminar o restaurar). Aplica solo al rol `authenticated`; lanza `only_owner_can_delete` (`ERRCODE 42501`, que la app trata como falta de permiso).

```sql
CREATE OR REPLACE FUNCTION protect_soft_delete()
RETURNS trigger AS $$
BEGIN
  IF current_user = 'authenticated'
     AND NEW.deleted_at IS DISTINCT FROM OLD.deleted_at
     AND NOT auth_is_owner_in(OLD.workshop_id) THEN
    RAISE EXCEPTION 'only_owner_can_delete' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

Ver [D-RLS-13](../security/decisions.md).

## Triggers: mismo taller en las tablas de unión

`repair_findings` y `quote_items` no tienen `workshop_id`, así que no pueden usar una FK compuesta. Un trigger `BEFORE INSERT OR UPDATE` comprueba que sus dos referencias sean del mismo taller y, si no, lanza `cross_workshop_reference` (`ERRCODE 23514`, que la app trata como error de validación). Son `SECURITY DEFINER` con `search_path` fijo para que la comprobación no dependa de lo que la RLS deje ver a quien escribe.

```sql
-- repair_findings: findings.workshop_id = recommended_repairs.workshop_id
CREATE TRIGGER trg_repair_findings_same_workshop
  BEFORE INSERT OR UPDATE ON repair_findings
  FOR EACH ROW EXECUTE FUNCTION enforce_repair_finding_same_workshop();

-- quote_items: quotes.workshop_id = items_catalog.workshop_id (si hay item_catalog_id)
CREATE TRIGGER trg_quote_items_same_workshop
  BEFORE INSERT OR UPDATE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION enforce_quote_item_same_workshop();
```

Ver [D-RLS-11](../security/decisions.md).

## Trigger: protección de membresías

Aplica solo al rol `authenticated` (dentro de las funciones `SECURITY DEFINER`, `current_user` es otro).

```sql
CREATE OR REPLACE FUNCTION protect_workshop_member_update()
RETURNS trigger AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.user_id <> OLD.user_id OR NEW.workshop_id <> OLD.workshop_id THEN
      RAISE EXCEPTION 'workshop_member_identity_immutable' USING ERRCODE = '42501';
    END IF;
    IF OLD.status = 'invited' AND NEW.status = 'active' THEN
      RAISE EXCEPTION 'invitation_must_be_accepted_by_invitee' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_workshop_members_protect BEFORE UPDATE ON workshop_members
  FOR EACH ROW EXECUTE FUNCTION protect_workshop_member_update();
```

Las funciones `create_workshop` y `accept_invitation` están descritas en [onboarding de taller](../multi-tenant/workshop-onboarding.md).
