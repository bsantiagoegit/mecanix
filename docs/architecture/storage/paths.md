# Estructura de Paths y Naming

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir la estructura de paths en el bucket `photos` y las convenciones de naming.

---

## Estructura de paths — Bucket `photos`

```
{workshop_id}/
  orders/
    {work_order_id}/
      {photo_uuid}.{ext}
```

**Ejemplo**:

```
a1b2c3d4-e5f6-7890-abcd-ef1234567890/
  orders/
    e5f6g7h8-i9j0-1234-5678-90abcdef1234/
      i9j0k1l2-m3n4-5678-90ab-cdef12345678.jpg
      m3n4o5p6-q7r8-9012-3456-7890abcdef12.webp
```

**Segmentos**:

1. `{workshop_id}` — UUID del taller. Aislamiento multi-tenant.
2. `orders` — literal, indica que es contenido de una orden.
3. `{work_order_id}` — UUID de la orden.
4. `{photo_uuid}.{ext}` — UUID de la foto + extensión derivada del MIME.

**Ventajas**:

- Todas las fotos de una orden bajo el mismo prefijo.
- `list('{workshop_id}/orders/{work_order_id}')` devuelve todas las fotos.
- RLS valida con `(storage.foldername(name))[1]`.

---

## Naming convention

| Elemento        | Formato             | Ejemplo                 |
| --------------- | ------------------- | ----------------------- |
| `workshop_id`   | UUID v4             | `a1b2c3d4-e5f6-...`     |
| `work_order_id` | UUID v4             | `e5f6g7h8-i9j0-...`     |
| Foto (nombre)   | UUID v4 + extensión | `i9j0k1l2-m3n4-....jpg` |
| Extensión foto  | Derivada del MIME   | `.jpg`, `.png`, `.webp` |

**Reglas**:

- Nunca usar el nombre original del archivo.
- Nunca usar caracteres especiales, espacios ni acentos.
- Siempre minúsculas.
- UUID v4 generado en el cliente.

---

## Derivación de extensión

| MIME type    | Extensión |
| ------------ | --------- |
| `image/jpeg` | `.jpg`    |
| `image/png`  | `.png`    |
| `image/webp` | `.webp`   |

**Función en cliente** (TypeScript):

```typescript
function extensionFromMime(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  return map[mime] ?? 'bin';
}
```

---

## Por qué no hay carpeta por `entity_type`

**Alternativa considerada**: `{workshop_id}/orders/{work_order_id}/{entity_type}/{uuid}.{ext}`.

**Descartada**: agrega profundidad sin beneficio real. El filtro por tipo se hace en SQL (`photos.entity_type`), no en el path.

---

## Referencias

- [README de storage](./README.md)
- [Decisiones transversales](./decisions.md)
- [Bucket](./buckets.md)

---

_Paths y Naming v1.1_
