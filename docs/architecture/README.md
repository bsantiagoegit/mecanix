# Arquitectura

Este directorio contiene las **decisiones técnicas** del proyecto. Complementa a `docs/domain/`, que define el negocio.

## Orden de lectura

1. [`data-model/`](./data-model/) — Modelo relacional PostgreSQL. Tablas, columnas, tipos, constraints, índices.
2. [`security/`](./security/) — Estrategia de RLS, autenticación, autorización.
3. `storage.md` — Estrategia de Supabase Storage. _(pendiente)_
4. `frontend.md` — Arquitectura Angular. _(pendiente)_
5. `state-management.md` — Estrategia de estado (NgRx + signals). _(pendiente)_
6. `pwa-offline.md` — Estrategia PWA y offline. _(pendiente)_
7. `adr/` — Architecture Decision Records. _(pendiente)_

## Estado actual

| Documento        | Versión | Estado        |
| ----------------- | ------- | -------------- |
| `data-model/`     | 1.0     | ✅ Estable     |
| `security/`       | 1.0     | ✅ Estable     |
| `storage.md`      | —       | ⏳ Pendiente   |
| `frontend.md`     | —       | ⏳ Pendiente   |
| `state-management.md` | — | ⏳ Pendiente   |
| `pwa-offline.md`  | —       | ⏳ Pendiente   |
| `adr/`            | —       | ⏳ Pendiente   |

## Relación con docs/domain

`docs/domain/` define **qué** construye el sistema (negocio).
`docs/architecture/` define **cómo** se construye (técnico).

Si hay conflicto entre ambos, `docs/domain/` gana. El código se adapta al dominio, no al revés.

## Convenciones

- Decisiones técnicas importantes se documentan como ADR en `adr/`.
- Cada documento tiene versión y fecha.
- Las referencias al dominio usan IDs estables (`UC-`, `RT-`, `T-`).

---

_Arquitectura v1.0 — Documento vivo._
