# Documentación

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026

---

## Propósito

Índice raíz de la documentación del proyecto. Explica qué hay en cada carpeta y en qué orden leer.

---

## Áreas de documentación

| Área             | Carpeta                                     | Propósito                                                                                                |
| ---------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Dominio**      | [`domain/`](./domain/README.md)             | Qué construye el sistema (negocio). Glosario, actores, estados, reglas, casos de uso, modelo conceptual. |
| **Arquitectura** | [`architecture/`](./architecture/README.md) | Cómo se construye (técnico). Modelo relacional, RLS, Storage, ADRs, frontend, estado, PWA.               |
| **Diseño**       | [`design/`](./design/README.md)             | Sistema de diseño. Tokens, Tailwind, componentes base, responsive, accesibilidad.                        |

---

## Orden de lectura sugerido

Para entender el proyecto completo:

1. [`domain/README.md`](./domain/README.md) — empezar por el glosario y los casos de uso.
2. [`architecture/README.md`](./architecture/README.md) — seguir con el modelo de datos y RLS.
3. [`design/README.md`](./design/README.md) — terminar con el sistema de diseño.

---

## Convenciones

- Cada carpeta tiene un `README.md` que actúa como índice.
- Los documentos de negocio van en `domain/`.
- Los documentos técnicos van en `architecture/`.
- Los documentos de UI/UX van en `design/`.
- Las referencias entre documentos usan paths relativos.
- Los IDs (`UC-`, `RT-`, `T-`, `ADR-`, `D-*`) son estables.

---

_Documentación v1.1 — Documento vivo._
