[← Índice de seguridad](./README.md)

# Vista `customers_public`

RLS no puede ocultar columnas. Para que el `mechanic` no vea datos de contacto, se crea una vista.

```sql
CREATE OR REPLACE VIEW customers_public
WITH (security_invoker = true)
AS
SELECT id, workshop_id, first_name, last_name, created_at, updated_at, deleted_at
  FROM customers;
```

La app usa `customers_public` cuando el usuario es `mechanic`, y `customers` cuando es `owner` o `advisor`.
