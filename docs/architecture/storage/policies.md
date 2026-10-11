# Policies de Storage

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir las policies de RLS sobre `storage.objects` para el bucket `photos`.

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

## Relación con policies de tabla

| Tabla    | Bucket   | Consistencia                       |
| -------- | -------- | ---------------------------------- |
| `photos` | `photos` | Mismos permisos: cualquier miembro |

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
