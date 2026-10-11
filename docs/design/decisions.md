# Decisiones Transversales — Design System

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Decisiones que aplican a **todo el sistema de diseño**. Se documentan aquí para no repetirlas.

---

## D-DS-01: Tailwind CSS v4 como único sistema

Tailwind v4 como único sistema de estilos. Sin CSS Modules, SCSS, styled-components ni Bootstrap.

**Razón**: Angular 21 ya viene con PostCSS. Tailwind v4 tiene mejor performance y configuración más simple.

---

## D-DS-02: Design tokens como CSS custom properties

Los tokens se definen como CSS custom properties en `styles.css` y Tailwind los consume vía `@theme`.

**Razón**: Tailwind v4 cambió la forma de definir tokens. Los tokens viven en un solo lugar. Funciona con dark mode.

---

## D-DS-03: Paleta funcional, no arbitraria

6 familias: `primary`, `neutral`, `success`, `warning`, `danger`, `info`. Cada una con 11 tonos.

**Razón**: colores semánticos, no decorativos. El desarrollador elige `primary-500`, no "un azul bonito".

---

## D-DS-04: Tipografía: Inter, 6 tamaños

Inter como fuente principal. 6 tamaños: `xs`, `sm`, `base`, `lg`, `xl`, `2xl`.

**Razón**: Inter es estándar para SaaS. 6 tamaños son suficientes. Más tamaños = decisiones arbitrarias.

---

## D-DS-05: Mobile-first, 3 breakpoints

Diseñar mobile-first. Solo 3 breakpoints: `sm` (640px), `md` (768px), `lg` (1024px).

**Razón**: la app se usa principalmente en móvil. Más breakpoints = más complejidad.

---

## D-DS-06 (revisada): Dark mode es MVP

Dark mode **sí se implementa en MVP** con 3 estados (`Claro / Oscuro / Sistema`).

**Razón**: el usuario lo pidió. Los tokens de D-DS-15 ya estaban preparados. Costo bajo, valor alto.

**Nota de revisión**: en v1.0 de este documento, D-DS-06 decía "dark mode no MVP". Se revisó tras feedback del usuario.

---

## D-DS-07: Componentes base en `shared/components/`

Los componentes UI base viven en `shared/components/`. Cada uno standalone, con `input()` y `output()`, sin lógica de negocio.

**Componentes**: button, input, textarea, select, checkbox, radio-group, card, modal, bottom-sheet, toast, skeleton, empty-state, error-state, badge, avatar, tabs, photo-uploader, photo-gallery.

**Razón**: un set base cubre el 90% de las pantallas. Se construye una vez y se reutiliza.

---

## D-DS-08: Sin librería de componentes externa

**No** usar Angular Material, PrimeNG, Taiga UI ni similar. Construir los componentes base a mano con Tailwind + Angular CDK.

**Razón**: las librerías traen su propio sistema de estilos que pelea con Tailwind. La app no necesita componentes complejos.

---

## D-DS-09: Iconos con Lucide

Usar **Lucide** como librería de iconos.

**Razón**: consistente, tree-shakeable, Angular-friendly, gratis, MIT.

**Alternativa descartada: Font Awesome**

- Peso del kit completo: 60-80 KB CSS [citation:5].
- Tree-shaking requiere configuración SVG+JS manual [citation:1].
- Estilo visual más pesado que no encaja con Tailwind.
- Brands (WhatsApp, email) se resuelven con SVGs inline.
- Licencia triple (CC BY 4.0 + SIL OFL 1.1 + MIT) vs MIT simple de Lucide.

---

## D-DS-10: Sin animaciones complejas

Solo transiciones simples (color, opacity, transform). Duraciones: 150ms (rápidas), 200ms (medias), 300ms (lentas).

**Razón**: la app prioriza velocidad. Tailwind tiene utilidades suficientes.

---

## D-DS-11: Accesibilidad mínima garantizada

Contraste AA (4.5:1 texto, 3:1 UI), focus visible, touch targets 44x44px, labels, roles, teclado.

**Razón**: es lo correcto. Mejora UX para todos.

---

## D-DS-12: Convenciones de clases Tailwind

1. **Orden consistente**: layout → spacing → sizing → colors → typography → effects → states.
2. **Sin valores arbitrarios** salvo casos justificados.
3. **Extraer a componentes** cuando se repiten 3+ veces.
4. **Sin `@apply`** salvo en componentes base.
5. **Usar `cn()` helper** para clases condicionales.

---

## D-DS-13: `cn()` helper para clases condicionales

Crear `cn()` en `shared/utils/cn.ts` que combine `clsx` + `tailwind-merge`.

**Razón**: clases condicionales sin concatenación fea. Resuelve conflictos de Tailwind.

---

## D-DS-14: Componentes con `input()` y `output()`

Todos los componentes usan `input()`, `output()`, `model()`. Sin `@Input()`, `@Output()`, `@ViewChild()`.

**Razón**: API moderna de Angular 21. Tipado fuerte. Integración con signals.

---

## D-DS-15 (revisada): Tokens preparados para dark mode

Los tokens se definen de forma que el dark mode se active con el atributo `data-theme="dark"` en `<html>`, sin refactor de componentes.

**Razón**: implementado en MVP (ver D-DS-06 revisada).

**Implementación**: ver [D-DS-16](#d-ds-16-estrategia-de-tema-3-estados).

## D-DS-16: Estrategia de tema (3 estados)

El tema tiene 3 estados: `Claro`, `Oscuro`, `Sistema`. El default es `Sistema`.

**Persistencia**: `localStorage` con clave `theme`.

**Aplicación**: el tema se aplica con el atributo `data-theme` en `<html>` (`light` o `dark`).

**Razón**:

- `Sistema` sigue la preferencia del SO (`prefers-color-scheme`).
- `Claro` / `Oscuro` son override manual.
- Persistir en `localStorage` mantiene la preferencia entre sesiones.

**Implementación**:

- `core/theme/theme.service.ts` — signal `theme`, método `setTheme()`, `effect()` que aplica `data-theme`.
- `shared/components/theme-toggle/` — toggle de 3 botones.

---

## D-DS-17: Clave del vehículo visible para todos los roles

El campo `key_code` del vehículo es visible para todos los roles activos (`owner`, `advisor`, `mechanic`).

**Razón**:

- El mecánico necesita la clave para mover el vehículo.
- En un taller pequeño, todos confían entre sí.
- Modelar "solo el owner ve la clave" crea fricción operativa.

**Implementación**:

- Sin vista `vehicles_public`.
- RLS normal (todos los roles activos del taller ven `vehicles`).
- En la UI, se muestra con toggle ver/ocultar (por UX, no por seguridad).

---

## Resumen

| ID      | Decisión                                 |
| ------- | ---------------------------------------- |
| D-DS-01 | Tailwind v4 como único sistema           |
| D-DS-02 | Design tokens como CSS custom properties |
| D-DS-03 | Paleta funcional, 6 familias             |
| D-DS-04 | Tipografía Inter, 6 tamaños              |
| D-DS-05 | Mobile-first, 3 breakpoints              |
| D-DS-06 | Dark mode es MVP (3 estados)             |
| D-DS-07 | Componentes base en `shared/components/` |
| D-DS-08 | Sin librería externa                     |
| D-DS-09 | Iconos con Lucide                        |
| D-DS-10 | Sin animaciones complejas                |
| D-DS-11 | Accesibilidad mínima                     |
| D-DS-12 | Convenciones de clases Tailwind          |
| D-DS-13 | `cn()` helper                            |
| D-DS-14 | Componentes con `input()`/`output()`     |
| D-DS-15 | Tokens preparados para dark mode         |
| D-DS-16 | Estrategia de tema (3 estados)           |
| D-DS-17 | Clave del vehículo visible para todos    |

---

## Referencias

- [README de design](./README.md)
- [Tokens](./tokens.md)
- [Tailwind config](./tailwind-config.md)
- [Convenciones](./conventions.md)

---

_Decisiones Transversales — Design System v1.0_
