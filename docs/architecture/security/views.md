# Vistas SQL — Seguridad

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

RLS no puede ocultar columnas. Cuando un rol necesita ver solo parte de una tabla, se crea una vista. Por defecto una vista corre con los permisos de su propietario y no aplica la RLS de la tabla base; `security_invoker = true` hace lo contrario. Cada vista documenta cuál usa y por qué.

---

## Vista `customers_public`

**Problema**: el `mechanic` necesita ver el nombre del cliente (para saber de quién es el vehículo) pero **no** debe ver `phone`, `email`, `address`, `identification`.

**Solución**: vista que expone solo los campos permitidos. La app usa `customers_public` cuando el usuario es `mechanic` y `customers` cuando es `owner` o `advisor`. Y la base de datos lo hace cumplir ([D-RLS-12](./decisions.md)): la policy de `customers` solo deja leer a `owner` y `advisor`, así que un `mechanic` que consulte `customers` directamente recibe cero filas.

```sql
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
```

**Nota sobre la vista del propietario**: a diferencia de la versión 1.0, `customers_public` **no** usa `security_invoker`. Con `security_invoker = true` aplicaría la RLS de `customers` y el `mechanic`, que ya no puede leer esa tabla, no vería nada. Corre con los permisos del propietario (que se salta la RLS) y por eso lleva su propio filtro `workshop_id = ANY(auth_workshop_ids())`: sin él mostraría los clientes de todos los talleres. `anon` no tiene acceso.

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
