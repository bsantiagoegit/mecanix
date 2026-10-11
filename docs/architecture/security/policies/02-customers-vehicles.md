# Policies: Clientes y Vehículos

**Tablas**: `customers`, `vehicles`, `vehicle_ownerships`

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## `customers`

**Regla**: cualquier miembro del taller ve los clientes. `owner` y `advisor` crean y editan. `mechanic` solo ve nombre (vía vista `customers_public`).

```sql
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select_member ON customers
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND deleted_at IS NULL);

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

**Nota sobre mechanic**: RLS no puede ocultar columnas. Para que el `mechanic` no vea `phone`, `email`, `address`, `identification`, se usa la vista `customers_public` (ver [`../views.md`](../views.md)).

---

## `vehicles`

**Regla**: cualquier miembro ve vehículos. `owner` y `advisor` crean y editan. `mechanic` solo ve.

```sql
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicles_select_member ON vehicles
  FOR SELECT
  TO authenticated
  USING (workshop_id = ANY(auth_workshop_ids()) AND deleted_at IS NULL);

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
