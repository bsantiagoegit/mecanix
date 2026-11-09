# Estrategia de Storage

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026
- **Buckets:** 2 (`photos` privado, `logos` público)
- **Próxima revisión:** Al implementar migraciones en Supabase

---

## Propósito

Define cómo se almacenan, organizan, sirven y protegen los archivos binarios en Supabase Storage: las fotos de las órdenes (`photos`) y el logo del taller (`logos`).

**No incluye RPCs** de creación de fotos (van con los casos de uso específicos).

**Nota**: los PDFs (informes inicial y final) se generan en el cliente y se comparten directamente por WhatsApp/email. **No se almacenan en Storage en MVP.** Ver D-ST-13.

---

## Orden de lectura

1. [`decisions.md`](./decisions.md) — Decisiones transversales (D-ST-01 a D-ST-14). **Empieza aquí.**
2. [`buckets.md`](./buckets.md) — Definición de los buckets.
3. [`paths.md`](./paths.md) — Estructura de paths y naming convention.
4. [`policies.md`](./policies.md) — Policies de Storage.
5. [`upload-flow.md`](./upload-flow.md) — Flujo de upload desde cliente.
6. [`limits.md`](./limits.md) — Límites y monitoreo.

---

## Principios

1. **`photos` es privado**: el acceso es vía URLs firmadas. El único bucket público es `logos` (D-ST-14, ADR-014), solo para el logo del taller.
2. **Multi-tenant desde el path**. El primer segmento es el `workshop_id`.
3. **Compresión obligatoria** en cliente. Nunca se sube el original.
4. **UUID como nombre**. Nunca el nombre original del archivo.
5. **Metadata en tabla, no en Storage**. La tabla `photos` es la fuente de verdad.
6. **Sin eliminación en MVP**. Las fotos son evidencia histórica.
7. **Whitelist de MIME types**. Solo formatos seguros.

---

## Estado actual

| Documento        | Versión | Estado     |
| ---------------- | ------- | ---------- |
| `decisions.md`   | 1.2     | ✅ Estable |
| `buckets.md`     | 1.2     | ✅ Estable |
| `paths.md`       | 1.2     | ✅ Estable |
| `policies.md`    | 1.2     | ✅ Estable |
| `upload-flow.md` | 1.1     | ✅ Estable |
| `limits.md`      | 1.1     | ✅ Estable |

---

## Referencias

- [Modelo relacional](../data-model/README.md)
- [Estrategia de seguridad](../security/README.md)
- [Glosario del dominio](../../domain/glossary.md)

---

_Estrategia de Storage v1.1 — Documento vivo._
