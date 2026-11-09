-- Aislamiento entre talleres (tenants) en las referencias, y mínimo privilegio sobre customers.
-- Fuente: docs/architecture/security/decisions.md (D-RLS-11, D-RLS-12 y D-T-11).
--
-- 1. Una FK normal solo comprueba que el id exista, SIN pasar por RLS: un asesor del taller A
--    podía insertar una fila de su taller que apuntara al cliente, vehículo u orden de otro
--    taller. Se reemplazan por claves compuestas (workshop_id, id): la base de datos garantiza
--    que hija y padre son del mismo taller, también para service_role y las funciones.
-- 2. El mechanic no debe leer los datos de contacto de customers: antes dependía de que la app
--    consultara la vista; ahora la policy de customers es solo para owner y advisor.

-- ---------------------------------------------------------------------------
-- 1a. Las tablas padre exponen (workshop_id, id) como clave candidata.
-- ---------------------------------------------------------------------------
ALTER TABLE customers ADD CONSTRAINT customers_workshop_id_id_key UNIQUE (workshop_id, id);
ALTER TABLE vehicles ADD CONSTRAINT vehicles_workshop_id_id_key UNIQUE (workshop_id, id);
ALTER TABLE work_orders ADD CONSTRAINT work_orders_workshop_id_id_key UNIQUE (workshop_id, id);
ALTER TABLE work_iterations ADD CONSTRAINT work_iterations_workshop_id_id_key UNIQUE (workshop_id, id);
ALTER TABLE inspections ADD CONSTRAINT inspections_workshop_id_id_key UNIQUE (workshop_id, id);
ALTER TABLE findings ADD CONSTRAINT findings_workshop_id_id_key UNIQUE (workshop_id, id);
ALTER TABLE recommended_repairs ADD CONSTRAINT recommended_repairs_workshop_id_id_key UNIQUE (workshop_id, id);
ALTER TABLE performed_repairs ADD CONSTRAINT performed_repairs_workshop_id_id_key UNIQUE (workshop_id, id);
ALTER TABLE items_catalog ADD CONSTRAINT items_catalog_workshop_id_id_key UNIQUE (workshop_id, id);
ALTER TABLE suppliers ADD CONSTRAINT suppliers_workshop_id_id_key UNIQUE (workshop_id, id);

-- ---------------------------------------------------------------------------
-- 1b. Claves foráneas entre tablas del taller: (workshop_id, columna) -> (workshop_id, id).
-- En las columnas opcionales (SET NULL) una referencia nula no se valida, como antes.
-- ---------------------------------------------------------------------------
ALTER TABLE vehicle_ownerships DROP CONSTRAINT vehicle_ownerships_customer_id_fkey;
ALTER TABLE vehicle_ownerships ADD CONSTRAINT vehicle_ownerships_customer_id_fkey
  FOREIGN KEY (workshop_id, customer_id) REFERENCES customers (workshop_id, id) ON DELETE RESTRICT;
ALTER TABLE vehicle_ownerships DROP CONSTRAINT vehicle_ownerships_vehicle_id_fkey;
ALTER TABLE vehicle_ownerships ADD CONSTRAINT vehicle_ownerships_vehicle_id_fkey
  FOREIGN KEY (workshop_id, vehicle_id) REFERENCES vehicles (workshop_id, id) ON DELETE RESTRICT;
ALTER TABLE work_orders DROP CONSTRAINT work_orders_customer_id_fkey;
ALTER TABLE work_orders ADD CONSTRAINT work_orders_customer_id_fkey
  FOREIGN KEY (workshop_id, customer_id) REFERENCES customers (workshop_id, id) ON DELETE RESTRICT;
ALTER TABLE work_orders DROP CONSTRAINT work_orders_vehicle_id_fkey;
ALTER TABLE work_orders ADD CONSTRAINT work_orders_vehicle_id_fkey
  FOREIGN KEY (workshop_id, vehicle_id) REFERENCES vehicles (workshop_id, id) ON DELETE RESTRICT;
ALTER TABLE vehicle_intakes DROP CONSTRAINT vehicle_intakes_work_order_id_fkey;
ALTER TABLE vehicle_intakes ADD CONSTRAINT vehicle_intakes_work_order_id_fkey
  FOREIGN KEY (workshop_id, work_order_id) REFERENCES work_orders (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE work_iterations DROP CONSTRAINT work_iterations_work_order_id_fkey;
ALTER TABLE work_iterations ADD CONSTRAINT work_iterations_work_order_id_fkey
  FOREIGN KEY (workshop_id, work_order_id) REFERENCES work_orders (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE inspections DROP CONSTRAINT inspections_work_iteration_id_fkey;
ALTER TABLE inspections ADD CONSTRAINT inspections_work_iteration_id_fkey
  FOREIGN KEY (workshop_id, work_iteration_id) REFERENCES work_iterations (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE findings DROP CONSTRAINT findings_inspection_id_fkey;
ALTER TABLE findings ADD CONSTRAINT findings_inspection_id_fkey
  FOREIGN KEY (workshop_id, inspection_id) REFERENCES inspections (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE diagnoses DROP CONSTRAINT diagnoses_finding_id_fkey;
ALTER TABLE diagnoses ADD CONSTRAINT diagnoses_finding_id_fkey
  FOREIGN KEY (workshop_id, finding_id) REFERENCES findings (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE recommended_repairs DROP CONSTRAINT recommended_repairs_work_iteration_id_fkey;
ALTER TABLE recommended_repairs ADD CONSTRAINT recommended_repairs_work_iteration_id_fkey
  FOREIGN KEY (workshop_id, work_iteration_id) REFERENCES work_iterations (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE approvals DROP CONSTRAINT approvals_recommended_repair_id_fkey;
ALTER TABLE approvals ADD CONSTRAINT approvals_recommended_repair_id_fkey
  FOREIGN KEY (workshop_id, recommended_repair_id) REFERENCES recommended_repairs (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE performed_repairs DROP CONSTRAINT performed_repairs_recommended_repair_id_fkey;
ALTER TABLE performed_repairs ADD CONSTRAINT performed_repairs_recommended_repair_id_fkey
  FOREIGN KEY (workshop_id, recommended_repair_id) REFERENCES recommended_repairs (workshop_id, id) ON DELETE RESTRICT;
ALTER TABLE labor_entries DROP CONSTRAINT labor_entries_performed_repair_id_fkey;
ALTER TABLE labor_entries ADD CONSTRAINT labor_entries_performed_repair_id_fkey
  FOREIGN KEY (workshop_id, performed_repair_id) REFERENCES performed_repairs (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE quotes DROP CONSTRAINT quotes_work_iteration_id_fkey;
ALTER TABLE quotes ADD CONSTRAINT quotes_work_iteration_id_fkey
  FOREIGN KEY (workshop_id, work_iteration_id) REFERENCES work_iterations (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE repair_items DROP CONSTRAINT repair_items_item_catalog_id_fkey;
ALTER TABLE repair_items ADD CONSTRAINT repair_items_item_catalog_id_fkey
  FOREIGN KEY (workshop_id, item_catalog_id) REFERENCES items_catalog (workshop_id, id) ON DELETE SET NULL (item_catalog_id);
ALTER TABLE repair_items DROP CONSTRAINT repair_items_recommended_repair_id_fkey;
ALTER TABLE repair_items ADD CONSTRAINT repair_items_recommended_repair_id_fkey
  FOREIGN KEY (workshop_id, recommended_repair_id) REFERENCES recommended_repairs (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE repair_items DROP CONSTRAINT repair_items_supplier_id_fkey;
ALTER TABLE repair_items ADD CONSTRAINT repair_items_supplier_id_fkey
  FOREIGN KEY (workshop_id, supplier_id) REFERENCES suppliers (workshop_id, id) ON DELETE SET NULL (supplier_id);
ALTER TABLE warranties DROP CONSTRAINT warranties_work_order_id_fkey;
ALTER TABLE warranties ADD CONSTRAINT warranties_work_order_id_fkey
  FOREIGN KEY (workshop_id, work_order_id) REFERENCES work_orders (workshop_id, id) ON DELETE CASCADE;
ALTER TABLE deliveries DROP CONSTRAINT deliveries_work_order_id_fkey;
ALTER TABLE deliveries ADD CONSTRAINT deliveries_work_order_id_fkey
  FOREIGN KEY (workshop_id, work_order_id) REFERENCES work_orders (workshop_id, id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- 1c. Las personas que aparecen en una fila (asesor, mecánico, autor) son miembros del mismo
-- taller. La membresía conserva su fila al desactivarse, así que el historial sigue siendo válido.
-- ---------------------------------------------------------------------------
ALTER TABLE work_orders DROP CONSTRAINT work_orders_advisor_id_fkey;
ALTER TABLE work_orders ADD CONSTRAINT work_orders_advisor_id_fkey
  FOREIGN KEY (workshop_id, advisor_id) REFERENCES workshop_members (workshop_id, user_id) ON DELETE RESTRICT;
ALTER TABLE inspections DROP CONSTRAINT inspections_mechanic_id_fkey;
ALTER TABLE inspections ADD CONSTRAINT inspections_mechanic_id_fkey
  FOREIGN KEY (workshop_id, mechanic_id) REFERENCES workshop_members (workshop_id, user_id) ON DELETE RESTRICT;
ALTER TABLE findings DROP CONSTRAINT findings_created_by_fkey;
ALTER TABLE findings ADD CONSTRAINT findings_created_by_fkey
  FOREIGN KEY (workshop_id, created_by) REFERENCES workshop_members (workshop_id, user_id) ON DELETE RESTRICT;
ALTER TABLE diagnoses DROP CONSTRAINT diagnoses_created_by_fkey;
ALTER TABLE diagnoses ADD CONSTRAINT diagnoses_created_by_fkey
  FOREIGN KEY (workshop_id, created_by) REFERENCES workshop_members (workshop_id, user_id) ON DELETE RESTRICT;
ALTER TABLE recommended_repairs DROP CONSTRAINT recommended_repairs_created_by_fkey;
ALTER TABLE recommended_repairs ADD CONSTRAINT recommended_repairs_created_by_fkey
  FOREIGN KEY (workshop_id, created_by) REFERENCES workshop_members (workshop_id, user_id) ON DELETE RESTRICT;
ALTER TABLE approvals DROP CONSTRAINT approvals_approved_by_fkey;
ALTER TABLE approvals ADD CONSTRAINT approvals_approved_by_fkey
  FOREIGN KEY (workshop_id, approved_by) REFERENCES workshop_members (workshop_id, user_id) ON DELETE RESTRICT;
ALTER TABLE performed_repairs DROP CONSTRAINT performed_repairs_mechanic_id_fkey;
ALTER TABLE performed_repairs ADD CONSTRAINT performed_repairs_mechanic_id_fkey
  FOREIGN KEY (workshop_id, mechanic_id) REFERENCES workshop_members (workshop_id, user_id) ON DELETE RESTRICT;
ALTER TABLE labor_entries DROP CONSTRAINT labor_entries_mechanic_id_fkey;
ALTER TABLE labor_entries ADD CONSTRAINT labor_entries_mechanic_id_fkey
  FOREIGN KEY (workshop_id, mechanic_id) REFERENCES workshop_members (workshop_id, user_id) ON DELETE RESTRICT;
ALTER TABLE quotes DROP CONSTRAINT quotes_created_by_fkey;
ALTER TABLE quotes ADD CONSTRAINT quotes_created_by_fkey
  FOREIGN KEY (workshop_id, created_by) REFERENCES workshop_members (workshop_id, user_id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------
-- 1d. Tablas de unión sin workshop_id propio: sus dos referencias deben ser del mismo taller.
-- (work_order_status_history la llena un trigger a partir de la orden.)
-- SECURITY DEFINER: la comprobación no depende de lo que la RLS deje ver a quien escribe.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_repair_finding_same_workshop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT workshop_id FROM findings WHERE id = NEW.finding_id)
     IS DISTINCT FROM
     (SELECT workshop_id FROM recommended_repairs WHERE id = NEW.recommended_repair_id) THEN
    RAISE EXCEPTION 'cross_workshop_reference' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repair_findings_same_workshop
  BEFORE INSERT OR UPDATE ON repair_findings
  FOR EACH ROW EXECUTE FUNCTION enforce_repair_finding_same_workshop();

CREATE OR REPLACE FUNCTION enforce_quote_item_same_workshop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.item_catalog_id IS NOT NULL
     AND (SELECT workshop_id FROM quotes WHERE id = NEW.quote_id)
         IS DISTINCT FROM
         (SELECT workshop_id FROM items_catalog WHERE id = NEW.item_catalog_id) THEN
    RAISE EXCEPTION 'cross_workshop_reference' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_quote_items_same_workshop
  BEFORE INSERT OR UPDATE ON quote_items
  FOR EACH ROW EXECUTE FUNCTION enforce_quote_item_same_workshop();

REVOKE ALL ON FUNCTION enforce_repair_finding_same_workshop(), enforce_quote_item_same_workshop()
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. customers: solo owner y advisor leen los datos de contacto.
-- El mechanic consulta customers_public, que ahora es una vista del propietario (sin
-- security_invoker) con su propio filtro de taller: expone únicamente el nombre.
-- ---------------------------------------------------------------------------
DROP POLICY customers_select_member ON customers;

CREATE POLICY customers_select_advisor_owner ON customers
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id));

CREATE OR REPLACE VIEW customers_public
AS
SELECT
  id,
  workshop_id,
  first_name,
  last_name,
  created_at,
  updated_at,
  deleted_at
FROM customers
WHERE workshop_id = ANY(auth_workshop_ids());

REVOKE ALL ON customers_public FROM PUBLIC, anon;
GRANT SELECT ON customers_public TO authenticated;
