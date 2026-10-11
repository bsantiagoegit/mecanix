# Decisiones Transversales — Storage

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Decisiones que aplican a **todo el storage**. Se documentan aquí para no repetirlas en cada archivo.

---

## D-ST-01: Un bucket, no dos

Crear un solo bucket: `photos` (imágenes).

**Razón**: los PDFs se generan en el cliente y se comparten directamente por WhatsApp/email. No se almacenan en MVP. Ver D-ST-13.

**Nota de versión**: en v1.0 se decidió crear dos buckets (`photos` y `documents`). En v1.1 se eliminó `documents` porque no hay tabla `documents` en el modelo relacional y los PDFs son regenerables.

---

## D-ST-02: Bucket privado + URLs firmadas

El bucket `photos` es privado (`public = false`). Acceso vía URLs firmadas con expiración (default 1 hora).

**Razón**: los datos del cliente son privados. Las URLs públicas exponen contenido.

---

## D-ST-03: Path multi-tenant

Todos los paths siguen el patrón `{workshop_id}/orders/{work_order_id}/{uuid}.{ext}`.

**Razón**: multi-tenant desde el path, organizado por orden, fácil de listar y exportar.

---

## D-ST-04: Un path por orden, no por entidad

Todas las fotos de una orden viven bajo el mismo prefijo. No hay carpetas por `entity_type`.

**Razón**: la relación específica vive en la tabla `photos`, no en el path. Filtro por tipo se hace en SQL.

---

## D-ST-05: Compresión obligatoria en cliente

Toda imagen se comprime antes de subir: 1920 px máximo, calidad 0.8, WebP, ≤ 500 KB.

**Razón**: el free tier se llena rápido sin compresión. 500 KB × 10 fotos/orden × 4 órdenes/día = 20 MB/día.

---

## D-ST-06: HEIC → JPEG en cliente

Si el dispositivo captura en HEIC (iPhone), convertir a JPEG/WebP antes de subir.

**Razón**: HEIC no es soportado por todos los navegadores. El bucket no acepta HEIC; el CHECK de `photos.mime_type` tampoco.

---

## D-ST-07: Filename con UUID

El nombre del archivo es un UUID v4 + extensión derivada del MIME. Nunca el nombre original.

**Razón**: el nombre original puede contener datos personales y puede colisionar.

---

## D-ST-08: Metadata en tabla, no en Storage

La información estructurada vive en la tabla `photos`. En Storage solo vive el binario.

**Razón**: la tabla `photos` es la fuente de verdad. La metadata de Storage es limitada.

---

## D-ST-09: Sin eliminación de fotos en MVP

Las fotos no se eliminan desde la aplicación. Si una foto salió mal, se sube otra.

**Razón**: las fotos son evidencia histórica. Eliminar rompe trazabilidad.

---

## D-ST-10: Limpieza de huérfanos vía cron en Fase 2

En MVP no hay limpieza automática. Se ejecuta manualmente si el storage supera el 80%.

**Razón**: sin eliminación, no hay huérfanos. Cron en Fase 2 cuando se implemente soft delete.

---

## D-ST-11: Límite de tamaño por archivo

`photos`: 5 MB por archivo.

**Razón**: previene uploads accidentales de archivos enormes.

---

## D-ST-12: MIME types permitidos (whitelist)

`photos`: `image/jpeg`, `image/png`, `image/webp`.

**Razón**: previene uploads de SVG, HTML, ejecutables, y HEIC (que se convierte en cliente).

**Consistencia con data-model**: el CHECK `photos_mime_valid` en `data-model/tables/08-photos.md` refleja la misma whitelist.

---

## D-ST-13: PDFs no se almacenan en MVP

Los informes inicial y final se generan en el cliente (html2canvas + jsPDF) y se comparten directamente por WhatsApp/email o se descargan. **No se suben a Storage.**

**Razón**:

- No existe tabla `documents` en el modelo relacional.
- Los PDFs son regenerables a partir de los datos en PostgreSQL.
- Ahorra storage en free tier.
- Simplifica el MVP.

**Fase 2**: si se necesita trazabilidad de "qué informe se envió al cliente y cuándo", se crea tabla `documents` + bucket. No es necesario para MVP.

---

## Resumen

| ID      | Decisión                       |
| ------- | ------------------------------ |
| D-ST-01 | Un bucket (`photos`)           |
| D-ST-02 | Bucket privado + URLs firmadas |
| D-ST-03 | Path multi-tenant              |
| D-ST-04 | Un path por orden              |
| D-ST-05 | Compresión obligatoria         |
| D-ST-06 | HEIC → JPEG                    |
| D-ST-07 | Filename con UUID              |
| D-ST-08 | Metadata en tabla              |
| D-ST-09 | Sin eliminación en MVP         |
| D-ST-10 | Limpieza en Fase 2             |
| D-ST-11 | Límite de tamaño               |
| D-ST-12 | MIME types whitelist           |
| D-ST-13 | PDFs no se almacenan en MVP    |

---

## Referencias

- [README de storage](./README.md)
- [Bucket](./buckets.md)
- [Paths](./paths.md)

---

_Decisiones Transversales — Storage v1.1_
