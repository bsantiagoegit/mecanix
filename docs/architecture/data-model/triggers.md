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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_work_orders_status_history AFTER UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION log_work_order_status_change();
```

**Nota**: `auth.uid()` es la función de Supabase que devuelve el UUID del usuario autenticado.

## Trigger: garantía automática

Se dispara al pasar a `completed`.

```sql
CREATE OR REPLACE FUNCTION create_warranty_on_completion()
RETURNS trigger AS $$
DECLARE
  v_warranty_days int;
  v_workshop_id uuid;
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
      now() + (v_warranty_days || ' days')::interval
    );
    NEW.completed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_work_orders_warranty AFTER UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION create_warranty_on_completion();
```
