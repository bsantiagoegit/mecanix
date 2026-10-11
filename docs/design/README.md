# Design System

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026
- **Framework de estilos:** Tailwind CSS v4
- **Próxima revisión:** Al implementar el primer feature completo

---

## Propósito

Define el sistema de diseño del frontend: tokens, configuración de Tailwind, componentes base, variantes, responsive, accesibilidad y convenciones.

**No incluye** la implementación de los componentes (va en el código). **No incluye** iconos (Lucide). **No incluye** animaciones complejas (Fase 2).

---

## Orden de lectura

1. [`decisions.md`](./decisions.md) — Decisiones transversales (D-DS-01 a D-DS-17). **Empieza aquí.**
2. [`tokens.md`](./tokens.md) — Design tokens (colores, tipografía, espaciado, radios, sombras, dark mode).
3. [`tailwind-config.md`](./tailwind-config.md) — Configuración de Tailwind v4 (incluye dark mode).
4. [`components.md`](./components.md) — Catálogo de componentes base.
5. [`responsive.md`](./responsive.md) — Mobile-first, breakpoints.
6. [`accessibility.md`](./accessibility.md) — Accesibilidad mínima.
7. [`conventions.md`](./conventions.md) — Convenciones de clases Tailwind.

---

## Principios

1. **Tailwind v4 como único sistema**. Sin CSS Modules, SCSS, ni librerías de componentes.
2. **Design tokens como CSS custom properties**. Tailwind los consume vía `@theme`.
3. **Paleta funcional, no decorativa**. 6 familias: primary, neutral, success, warning, danger, info.
4. **Tipografía limitada a 6 tamaños**. Inter como fuente principal.
5. **Mobile-first**. Solo 3 breakpoints (sm, md, lg).
6. **Dark mode es MVP**. 3 estados: Claro / Oscuro / Sistema (D-DS-16).
7. **Componentes base en `shared/components/`**. Sin librería externa.
8. **Iconos con Lucide**.
9. **Accesibilidad mínima garantizada** (contraste AA, focus, touch targets 44px).
10. **`cn()` helper** para clases condicionales.

---

## Estado actual

| Documento            | Versión | Estado     |
| -------------------- | ------- | ---------- |
| `decisions.md`       | 1.1     | ✅ Estable |
| `tokens.md`          | 1.1     | ✅ Estable |
| `tailwind-config.md` | 1.1     | ✅ Estable |
| `components.md`      | 1.1     | ✅ Estable |
| `responsive.md`      | 1.0     | ✅ Estable |
| `accessibility.md`   | 1.0     | ✅ Estable |
| `conventions.md`     | 1.1     | ✅ Estable |

---

## Referencias

- [Arquitectura Frontend](../architecture/frontend/README.md)
- [PWA / Manifest](../architecture/pwa-offline/manifest.md)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Angular CDK](https://material.angular.io/cdk/categories)
- [Lucide](https://lucide.dev/)

---

_Design System v1.1 — Documento vivo._
