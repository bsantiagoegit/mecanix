# Documentación

Documentación del Sistema de Gestión para Taller Mecánico Automotriz (SaaS Multi-Tenant). Se divide en dos partes:

| Directorio | Responde a | Índice |
| ---------- | ---------- | ------ |
| [`domain/`](./domain/) | **Qué** construye el sistema (negocio) | [`domain/README.md`](./domain/README.md) |
| [`architecture/`](./architecture/) | **Cómo** se construye (técnico) | [`architecture/README.md`](./architecture/README.md) |

## Cómo navegar

- **Nuevo en el proyecto / no conoces el negocio del taller**: empieza en [`domain/README.md`](./domain/README.md) — glosario, actores, casos de uso, modelo conceptual.
- **Vas a escribir código o tocar infraestructura**: ya deberías conocer el dominio; entra directo a [`architecture/README.md`](./architecture/README.md) — modelo relacional, RLS, storage, frontend, estado, PWA, ADRs.

## Regla de conflicto

Si `domain/` y `architecture/` se contradicen, **`domain/` gana**. El código se adapta al negocio, no al revés.

---

_Documentación v1.0 — Documento vivo._
