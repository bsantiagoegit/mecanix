# Arquitectura

Este directorio contiene las **decisiones técnicas** del proyecto. Complementa a `docs/domain/`, que define el negocio.

## Orden de lectura

1. `data-model/` — Modelo relacional PostgreSQL. Empieza por [`data-model/README.md`](./data-model/README.md).
2. `security/` — Estrategia de RLS, autenticación, autorización. Empieza por [`security/README.md`](./security/README.md).
3. `storage/` — Estrategia de Supabase Storage. Empieza por [`storage/README.md`](./storage/README.md).
4. `frontend.md` — Arquitectura Angular. _(pendiente)_
5. `state-management.md` — Estrategia de estado (NgRx + signals). _(pendiente)_
6. `pwa-offline.md` — Estrategia PWA y offline. _(pendiente)_
7. `adr/` — Architecture Decision Records. Empieza por [`adr/README.md`](./adr/README.md).

## Estado actual

| Documento             | Versión | Estado       |
| --------------------- | ------- | ------------ |
| `data-model/`         | 1.0     | ✅ Estable   |
| `security/`           | 1.0     | ✅ Estable   |
| `storage/`            | 1.1     | ✅ Estable   |
| `adr/`                | 1.0     | ✅ Estable   |
| `frontend.md`         | —       | ⏳ Pendiente |
| `state-management.md` | —       | ⏳ Pendiente |
| `pwa-offline.md`      | —       | ⏳ Pendiente |

## Relación con docs/domain

`docs/domain/` define **qué** construye el sistema (negocio).
`docs/architecture/` define **cómo** se construye (técnico).

Si hay conflicto entre ambos, `docs/domain/` gana. El código se adapta al dominio, no al revés.

## Convenciones

- Decisiones técnicas importantes se documentan como ADR en `adr/`.
- Cada documento tiene versión y fecha.
- Las referencias al dominio usan IDs estables (`UC-`, `RT-`, `T-`).

---

_Arquitectura v1.1 — Documento vivo._
