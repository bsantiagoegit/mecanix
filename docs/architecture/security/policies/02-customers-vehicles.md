# Policies: Clientes y Vehículos

**Tablas**: `customers`, `vehicles`, `vehicle_ownerships`

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## `customers`

**Regla**: `owner` y `advisor` ven, crean y editan los clientes. `mechanic` no lee `customers`: solo ve el nombre por la vista `customers_public` ([D-RLS-12](../decisions.md)).

```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select_advisor_owner ON customers
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY customers_insert_advisor_owner ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY customers_update_advisor_owner ON customers
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

-- Sin DELETE. Soft delete = UPDATE deleted_at.
```

**Soft delete y SELECT**: la policy de SELECT **no** filtra `deleted_at`. Postgres valida la fila nueva de un `UPDATE` contra las policies de SELECT; con `AND deleted_at IS NULL` el `UPDATE ... SET deleted_at` fallaba con `new row violates row-level security policy`. Los registros borrados se excluyen en las consultas (`.is('deleted_at', null)`). Misma regla para `vehicles`.

**Nota sobre mechanic**: RLS no puede ocultar columnas, así que se separa por filas: la tabla es solo para `owner` y `advisor`, y el `mechanic` consulta la vista `customers_public`, que expone únicamente el nombre (ver [`../views.md`](../views.md)). Antes (v1.0) la policy dejaba leer a cualquier miembro y la separación dependía de que la app consultara la vista.

**Referencias**: `vehicle_ownerships.customer_id` y `vehicle_id` son FK compuestas con `workshop_id` ([D-RLS-11](../decisions.md)): una propiedad no puede apuntar a un cliente o vehículo de otro taller.

---

## `vehicles`

**Regla**: cualquier miembro ve vehículos. `owner` y `advisor` crean y editan. `mechanic` solo ve.

```sql
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicles_select_member ON vehicles
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY vehicles_insert_advisor_owner ON vehicles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY vehicles_update_advisor_owner ON vehicles
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

-- Sin DELETE. Soft delete = UPDATE deleted_at.
```

---

## `vehicle_ownerships`

**Regla**: cualquier miembro ve. `owner` y `advisor` crean y cierran (`ended_at`).

```sql
ALTER TABLE vehicle_ownerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_ownerships_select_member ON vehicle_ownerships
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()));

CREATE POLICY vehicle_ownerships_insert_advisor_owner ON vehicle_ownerships
  FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_advisor_or_owner_in(workshop_id));

CREATE POLICY vehicle_ownerships_update_advisor_owner ON vehicle_ownerships
  FOR UPDATE
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND auth_is_advisor_or_owner_in(workshop_id))
  WITH CHECK (workshop_id = ANY(auth_workshop_ids()));

-- Sin DELETE. Cerrar ownership = UPDATE ended_at.
```

---

## Referencias

- [README de policies](./README.md)
- [Decisiones transversales](../decisions.md)
- [Helpers](../helpers.md)
- [Vistas](../views.md)
- [Tablas: Customers y Vehicles](../../data-model/tables/02-customers-vehicles.md)

---

_Policies de Clientes y Vehículos v1.0_
