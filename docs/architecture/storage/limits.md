# Límites y Monitoreo

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Definir los límites del free tier de Supabase, calcular la capacidad real del sistema, y definir la estrategia de monitoreo y migración.

---

## Free tier de Supabase

| Recurso                       | Límite |
| ----------------------------- | ------ |
| Storage total                 | 1 GB   |
| Bandwidth mensual             | 2 GB   |
| Upload por archivo (`photos`) | 5 MB   |

---

## Cálculo de capacidad

### Por foto comprimida

- Tamaño típico: ~500 KB.
- 10 fotos por orden = ~5 MB.
- 4 órdenes por día = ~20 MB/día.
- 20 días hábiles/mes = ~400 MB/mes.

### Free tier (1 GB)

- ~2.5 meses con 1 taller activo.
- ~1.25 meses con 2 talleres activos.
- ~25 días con 4 talleres activos.

**Nota**: los PDFs no se almacenan (D-ST-13), así que no consumen storage.

---

## Estrategia de mitigación

1. **Compresión agresiva** (D-ST-05): 500 KB por foto.
2. **Límite de fotos por orden**: máximo 20 fotos por orden (configurable por taller, Fase 2).
3. **Migrar a Pro**: cuando el storage supere el 80% (800 MB), migrar a Supabase Pro ($25/mes).
4. **Monitoreo**: revisar el dashboard de Supabase mensualmente.

---

## Supabase Pro

| Recurso           | Límite  |
| ----------------- | ------- |
| Storage total     | 100 GB  |
| Bandwidth mensual | 200 GB  |
| Precio            | $25/mes |

**Conclusión**: con Pro, el sistema soporta ~50 talleres activos sin problema.

---

## Monitoreo

### En MVP

- Revisar dashboard de Supabase mensualmente.
- Verificar uso de storage y bandwidth.
- Si supera el 80%, migrar a Pro.

### En Fase 2

- Alerta automática cuando el storage supere el 80%.
- Cron que reporta uso mensual.
- Dashboard de uso por taller (para el SaaS admin).
- Límite de fotos por orden configurable (`workshops.max_photos_per_order`).

---

## Referencias

- [README de storage](./README.md)
- [Decisiones transversales](./decisions.md)
- [Bucket](./buckets.md)

---

_Límites y Monitoreo v1.1_
