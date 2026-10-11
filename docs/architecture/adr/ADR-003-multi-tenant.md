# ADR-003: Multi-tenant desde el día 1

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

El proyecto es un **SaaS que se venderá a múltiples talleres**. Inicialmente hay 1 taller, pero el objetivo es venderlo a otros talleres similares.

Dos opciones:

1. **Single-tenant ahora, multi-tenant después**: construir para 1 taller, migrar cuando haya más.
2. **Multi-tenant desde el día 1**: construir con aislamiento desde el inicio.

El costo de migrar de single-tenant a multi-tenant es **muy alto**: cada tabla necesita `workshop_id`, cada query necesita filtro, cada policy de RLS necesita `workshop_id`, los datos existentes necesitan migración.

---

## Decisión

**Multi-tenant desde el día 1.** Todas las tablas de negocio tienen `workshop_id`. RLS filtra por taller. Los usuarios pueden pertenecer a múltiples talleres vía `workshop_members`.

---

## Alternativas consideradas

### Alternativa A: Single-tenant ahora

- **Descripción**: construir para 1 taller, sin `workshop_id`.
- **Ventajas**: menos columnas, queries más simples, menos código de RLS.
- **Desventajas**: migrar después requiere:
  - Agregar `workshop_id` a ~20 tablas.
  - Backfill de datos existentes.
  - Reescribir todas las policies de RLS.
  - Reescribir todas las queries del frontend.
- **Razón de descarte**: el costo de migración es prohibitivo. Y el objetivo del proyecto es venderlo a varios talleres.

### Alternativa B: Multi-tenant con schema separado por taller

- **Descripción**: un schema PostgreSQL por taller.
- **Ventajas**: aislamiento total, `workshop_id` no necesario en cada tabla.
- **Desventajas**: gestión de migraciones × N talleres. RLS no necesario (cada schema es independiente). Supabase no soporta bien múltiples schemas.
- **Razón de descarte**: Supabase no está diseñado para multi-schema. La gestión se complica.

### Alternativa C: Multi-tenant con base de datos separada por taller

- **Descripción**: una DB por taller.
- **Ventajas**: aislamiento total.
- **Desventajas**: costo × N talleres. Supabase free tier = 2 proyectos. Escala mal.
- **Razón de descarte**: costo prohibitivo y gestión compleja.

---

## Consecuencias

### Positivas

- El sistema está listo para vender a múltiples talleres desde el día 1.
- Una sola base de datos, un solo esquema.
- Migraciones únicas para todos los talleres.
- RLS garantiza aislamiento a nivel de fila.
- Los reportes globales (para ti como SaaS admin) son triviales.

### Negativas

- Todas las tablas de negocio tienen `workshop_id` (columna extra).
- Todas las policies de RLS incluyen `workshop_id = ANY(auth_workshop_ids())`.
- Complejidad de RLS mayor que single-tenant.
- Los tests deben cubrir el aislamiento entre talleres.

### Neutras

- El taller en MVP es "el primer cliente" del SaaS.
- El onboarding de talleres es un caso de uso (UC-WS-01 a UC-WS-08).

---

## Referencias

- [Estrategia de seguridad](../security/README.md)
- [Modelo relacional](../data-model/README.md)
- [Actores y roles](../../domain/actors-and-roles.md)

---

_ADR-003 — Multi-tenant desde el día 1_
