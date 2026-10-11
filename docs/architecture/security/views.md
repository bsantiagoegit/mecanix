# Vistas SQL — Seguridad

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

RLS no puede ocultar columnas. Cuando un rol necesita ver solo parte de una tabla, se crea una vista. Las vistas usan `security_invoker = true` para que RLS de la tabla base siga aplicando.

---

## Vista `customers_public`

**Problema**: el `mechanic` necesita ver el nombre del cliente (para saber de quién es el vehículo) pero **no** debe ver `phone`, `email`, `address`, `identification`.

**Solución**: vista que expone solo los campos permitidos. La app usa `customers_public` cuando el usuario es `mechanic` y `customers` cuando es `owner` o `advisor`.

```sql
CREATE OR REPLACE VIEW customers_public
WITH (security_invoker = true)
AS
SELECT
  id,
  workshop_id,
  first_name,
  last_name,
  created_at,
  updated_at,
  deleted_at
FROM customers;
```

**Nota sobre `security_invoker = true`**: la vista corre con los permisos del usuario que consulta, no del creador. Así RLS de `customers` sigue aplicando. Si se omitiera, la vista correría con permisos del creador y podría bypasear RLS.

**Uso en Angular**: el data service de `customers` decide qué vista consultar según el rol del usuario autenticado. El `mechanic` nunca hace `SELECT * FROM customers` directamente.

---

## Por qué no hay más vistas

- **`vehicles`**: no tiene columnas sensibles. Todos los roles ven todo.
- **`work_orders`**: no tiene columnas sensibles. Todos los roles ven todo, pero el `mechanic` no ve `quotes` (es otra tabla).
- **`quotes` y `quote_items`**: RLS bloquea el acceso directo para `mechanic`. No necesita vista.
- **`photos`**: no tiene columnas sensibles.

Si en el futuro aparece otra necesidad de ocultar columnas, se agrega otra vista aquí.

---

## Referencias

- [README de security](./README.md)
- [Decisiones transversales](./decisions.md)
- [Policies de customers y vehicles](./policies/02-customers-vehicles.md)

---

_Vistas SQL v1.0_
