# ADR-004: UUID v4 como primary keys

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

Necesitamos elegir el tipo de primary key para las 27 tablas del modelo relacional. Opciones comunes:

1. **`bigserial`** (entero autoincremental).
2. **`uuid` v4** (aleatorio).
3. **`uuid` v7** (ordenable por tiempo).
4. **`text` con ULID** (ordenable, legible).

El sistema es multi-tenant. Los IDs de diferentes talleres podrían colisionar si usamos `bigserial` y exportamos datos entre talleres. Además, los IDs aparecen en URLs (`/orders/{id}`), y no queremos exponer cuántos registros hay.

---

## Decisión

Usar **`uuid` v4** con `gen_random_uuid()` como primary key de todas las tablas de negocio. Excepción: `roles` usa `text` como PK (catálogo cerrado de 3 valores).

---

## Alternativas consideradas

### Alternativa A: `bigserial`

- **Descripción**: entero autoincremental de 64 bits.
- **Ventajas**: más eficiente en storage (8 bytes vs 16). Índices más rápidos. Legible (`id=42`).
- **Desventajas**:
  - IDs predecibles: `/orders/42` revela cuántos registros hay.
  - Colisión entre talleres si se exportan datos.
  - Migración a multi-región complicada (secuencia global).
- **Razón de descarte**: la previsibilidad y el multi-tenant lo hacen inviable.

### Alternativa B: `uuid` v7

- **Descripción**: UUID ordenable por tiempo (prefijo temporal).
- **Ventajas**: ordenable, mejor performance en índices que v4.
- **Desventajas**: PostgreSQL no tiene `gen_random_uuid()` v7 nativo. Requiere extensión o generación en cliente.
- **Razón de descarte**: para el volumen del taller (4 órdenes/día), la diferencia de performance es insignificante. La simplicidad de v4 gana.

### Alternativa C: ULID como `text`

- **Descripción**: identificador de 26 caracteres ordenable.
- **Ventajas**: ordenable, legible, sin guiones.
- **Desventajas**: menos soporte en PostgreSQL y en herramientas. El frontend debe generar y parsear.
- **Razón de descarte**: UUID v4 es estándar, soportado por todas las herramientas, y Supabase lo usa internamente.

---

## Consecuencias

### Positivas

- IDs no predecibles (URLs seguras).
- Sin colisión entre talleres.
- Facilita migración a multi-región.
- `gen_random_uuid()` es nativo en PostgreSQL (extensión `pgcrypto`).
- Todas las herramientas (Supabase, Angular, TypeScript) soportan UUID nativamente.

### Negativas

- 16 bytes vs 8 bytes de `bigserial` (el doble de storage).
- Índices ligeramente más lentos (aunque insignificante a esta escala).
- URLs más largas (`/orders/a1b2c3d4-...` vs `/orders/42`).

### Neutras

- El frontend genera UUIDs para entidades antes de insertarlas (útil para optimismo).
- Los IDs son "feos" pero funcionales.

---

## Referencias

- [Modelo relacional](../data-model/README.md)
- [Decisiones transversales de data-model](../data-model/decisions.md)

---

_ADR-004 — UUID v4 como primary keys_
