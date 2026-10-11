# Bucket — Definición

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir el bucket de Supabase Storage, sus parámetros y su propósito.

---

## Bucket `photos`

**Propósito**: almacenar todas las imágenes del sistema (intake, hallazgos, diagnósticos, reparaciones, órdenes).

**Configuración**:

| Parámetro                 | Valor                                   |
| ------------------------- | --------------------------------------- |
| Nombre                    | `photos`                                |
| Público                   | `false`                                 |
| Tamaño máximo por archivo | `5242880` (5 MB)                        |
| MIME types permitidos     | `image/jpeg`, `image/png`, `image/webp` |

**Creación** (vía SQL o dashboard):

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'photos',
  'photos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

---

## Por qué un solo bucket

**Alternativa considerada**: dos buckets (`photos` y `documents`).

**Descartada**: los PDFs (informes) se generan en el cliente y se comparten directamente. No se almacenan en MVP (D-ST-13). No hay tabla `documents` en el modelo relacional. Si en Fase 2 se necesita trazabilidad, se crea el bucket entonces.

---

## Referencias

- [README de storage](./README.md)
- [Decisiones transversales](./decisions.md)
- [Paths](./paths.md)

---

_Bucket v1.1_
