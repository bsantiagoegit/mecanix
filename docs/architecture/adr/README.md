# Architecture Decision Records (ADRs)

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Registro de decisiones arquitectónicas importantes. Cada ADR documenta **una** decisión, con su contexto, alternativas y consecuencias.

**Un ADR es inmutable.** Una vez aceptado, no se modifica. Si una decisión cambia, se crea un nuevo ADR que **supersede** al anterior.

---

## Cuándo crear un ADR

Crear ADR cuando la decisión:

- Es **costosa de revertir** (afecta a múltiples partes del sistema).
- **Resuelve un trade-off no obvio** (hay alternativas razonables).
- **Afecta a múltiples personas** (no es una preferencia individual).
- **Tiene consecuencias a largo plazo** (seguridad, performance, mantenibilidad).

**No crear ADR** para:

- Nombres de variables o archivos.
- Formato de código.
- Preferencias estéticas.
- Decisiones triviales.

---

## Estados de un ADR

| Estado                   | Significado                   |
| ------------------------ | ----------------------------- |
| `propuesto`              | En discusión, aún no aceptado |
| `aceptado`               | Aprobado, en vigor            |
| `rechazado`              | Evaluado y descartado         |
| `deprecado`              | Aceptado pero ya no aplica    |
| `superseded por ADR-NNN` | Reemplazado por otro ADR      |

---

## Índice de ADRs

| #                                             | Título                                          | Estado      | Fecha   |
| --------------------------------------------- | ----------------------------------------------- | ----------- | ------- |
| [ADR-001](./ADR-001-angular-21.md)            | Angular 21 como framework frontend              | ✅ Aceptado | 2026-10 |
| [ADR-002](./ADR-002-supabase.md)              | Supabase como backend-as-a-service              | ✅ Aceptado | 2026-10 |
| [ADR-003](./ADR-003-multi-tenant.md)          | Multi-tenant desde el día 1                     | ✅ Aceptado | 2026-10 |
| [ADR-004](./ADR-004-uuid-pks.md)              | UUID v4 como primary keys                       | ✅ Aceptado | 2026-10 |
| [ADR-005](./ADR-005-estrategia-estado.md)     | Estrategia de estado: signals + NgRx selectivo  | ✅ Aceptado | 2026-10 |
| [ADR-006](./ADR-006-pwa-online-first.md)      | PWA con estrategia online-first                 | ✅ Aceptado | 2026-10 |
| [ADR-007](./ADR-007-orden-iteraciones.md)     | Orden de trabajo con iteraciones                | ✅ Aceptado | 2026-10 |
| [ADR-008](./ADR-008-aprobacion-individual.md) | Aprobación por reparación individual            | ✅ Aceptado | 2026-10 |
| [ADR-009](./ADR-009-storage-privado.md)       | Storage privado con URLs firmadas               | ✅ Aceptado | 2026-10 |
| [ADR-010](./ADR-010-un-bucket.md)             | Un solo bucket (`photos`), PDFs no se almacenan | ✅ Aceptado | 2026-10 |
| [ADR-011](./ADR-011-feature-flags.md)         | Feature flags                                   | ✅ Aceptado | 2026-10 |

---

## Cómo crear un ADR

1. Copia [`_template.md`](./_template.md) al nuevo archivo.
2. Asigna el siguiente número disponible (`ADR-NNN`).
3. Completa las secciones.
4. Actualiza la tabla de este README.
5. Commitea.

---

## Cómo superseder un ADR

1. Crea un nuevo ADR con el siguiente número.
2. En el campo "Supersede", indica el ADR anterior.
3. En el ADR anterior, cambia el estado a `superseded por ADR-NNN`.
4. Actualiza la tabla de este README.

**No modifiques el contenido del ADR anterior.** Solo su estado.

---

## Referencias

- [Arquitectura general](../README.md)
- [Modelo relacional](../data-model/README.md)
- [Seguridad](../security/README.md)
- [Storage](../storage/README.md)

---

_ADRs v1.1 — Documento vivo._
