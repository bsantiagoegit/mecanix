# Policies de Storage

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir las policies de RLS sobre `storage.objects` para los buckets `photos` y `logos`.

**Nota**: Supabase Storage tiene su propia tabla `storage.objects`. Se aplican policies con la misma sintaxis que RLS, usando los helpers `auth_workshop_ids()`.

---

## Bucket `photos`

**Reglas**:

- `SELECT`: cualquier miembro del taller.
- `INSERT`: cualquier miembro del taller.
- `UPDATE`: nadie.
- `DELETE`: nadie en MVP.

```sql
CREATE POLICY "photos_select_member" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1]::uuid = ANY(auth_workshop_ids())
  );

CREATE POLICY "photos_insert_member" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'photos'
    AND (storage.foldername(name))[1]::uuid = ANY(auth_workshop_ids())
  );

-- Sin UPDATE, sin DELETE en MVP.
```

**Nota sobre `storage.foldername(name)`**: función de Supabase que devuelve un array con los segmentos del path. `[1]` es el primer segmento (el `workshop_id`).

**Cast a `uuid`**: valida que el path tenga un UUID válido. Si no, la policy falla.

---

## Bucket `logos`

**Reglas**:

- `SELECT` público: el bucket es público, la URL pública se sirve sin pasar por RLS. La policy de `SELECT` existe para que el `owner` pueda localizar el archivo al eliminarlo.
- `INSERT` y `DELETE`: solo el `owner` del taller cuyo `workshop_id` es el primer segmento del path.
- `UPDATE`: nadie (cada subida es un archivo nuevo).

```sql
CREATE POLICY "logos_select_owner" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND auth_is_owner_in(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "logos_insert_owner" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'logos'
    AND auth_is_owner_in(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "logos_delete_owner" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'logos'
    AND auth_is_owner_in(((storage.foldername(name))[1])::uuid)
  );
```

`auth_is_owner_in(p_workshop_id)` ya comprueba que el usuario sea `owner` **activo** de ese taller, así que no hace falta combinarlo con `auth_workshop_ids()`.

---

## Relación con policies de tabla

| Tabla / columna      | Bucket   | Consistencia                                                           |
| -------------------- | -------- | ---------------------------------------------------------------------- |
| `photos`             | `photos` | Mismos permisos: cualquier miembro                                     |
| `workshops.logo_url` | `logos`  | Solo el `owner` sube el archivo y solo el `owner` actualiza `logo_url` |

**Regla**: si un usuario puede leer una fila de `photos`, puede leer el archivo correspondiente en Storage. Si puede insertar una fila en `photos`, puede subir el archivo.

---

## Consideración de performance

El cast `(storage.foldername(name))[1]::uuid` se repite en cada policy. Para simplificar, se podría crear un helper `auth_owns_path(path text)`. **Decisión**: mantenerlo inline en MVP para no agregar otra función.

---

## Referencias

- [README de storage](./README.md)
- [Decisiones transversales](./decisions.md)
- [Estrategia de seguridad](../security/README.md)
- [Helpers de RLS](../security/helpers.md)

---

_Policies de Storage v1.1_
