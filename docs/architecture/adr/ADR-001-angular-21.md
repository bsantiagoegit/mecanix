# ADR-001: Angular 21 como framework frontend

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

Necesitamos un framework frontend para una PWA mobile-first con las siguientes características:

- Multi-tenant (varios talleres en la misma app).
- Uso en Android e iOS (PWA, no nativa).
- Formularios complejos (órdenes de trabajo con múltiples sub-entidades).
- Estado compartido entre pantallas (orden en curso, sesión, taller activo).
- Generación de PDFs en cliente.
- Captura de fotos desde cámara.
- Consumo de API de Supabase.
- Sin equipo de frontend dedicado (1 desarrollador con experiencia en Angular).

El desarrollador tiene 5 años de experiencia en Angular, NgRx y manejo de estado. No tiene experiencia en React ni Vue.

---

## Decisión

Usar **Angular 21** con:

- Standalone components (por defecto en 21).
- Signals para estado local y derivado.
- `resource` y `httpResource` para data fetching reactivo.
- Reactive Forms.
- Control flow moderno (`@if`, `@for`, `@switch`).
- Zoneless change detection (activado por defecto en 21).
- Tailwind CSS para estilos.
- Angular PWA (`@angular/pwa`) para service worker y manifest.

---

## Alternativas consideradas

### Alternativa A: React con Next.js

- **Descripción**: ecosistema más grande, más librerías, mejor soporte de Vercel.
- **Ventajas**: comunidad más grande, más ofertas de trabajo, mejor integración con Vercel.
- **Desventajas**: el desarrollador no lo conoce. Curva de aprendizaje. Los patrones de React (hooks, context) son distintos a Angular.
- **Razón de descarte**: el desarrollador tiene 5 años de experiencia en Angular. Cambiar a React significaría perder esa ventaja.

### Alternativa B: Vue con Nuxt

- **Descripción**: framework progresivo, buena DX.
- **Ventajas**: sintaxis simple, buena performance.
- **Desventajas**: el desarrollador no lo conoce. Menos estructurado que Angular para apps grandes.
- **Razón de descarte**: mismo que React. La experiencia previa importa.

### Alternativa C: SvelteKit

- **Descripción**: framework moderno, compila a JS puro.
- **Ventajas**: menos código, mejor performance.
- **Desventajas**: ecosistema más pequeño, menos librerías, el desarrollador no lo conoce.
- **Razón de descarte**: mismo que React y Vue.

### Alternativa D: Angular 20 en lugar de Angular 21

- **Descripción**: versión anterior, más madura.
- **Ventajas**: más tiempo en el mercado, más tutoriales.
- **Desventajas**: Angular 21 tiene zoneless por defecto, Vitest estable, mejor soporte de signals.
- **Razón de descarte**: Angular 21 es estable y tiene mejoras significativas sin costo adicional.

---

## Consecuencias

### Positivas

- El desarrollador es productivo desde el día 1.
- Angular tiene todo lo necesario: DI, routing, forms, HTTP, PWA.
- Signals simplifica el estado local (reemplaza mucho uso de NgRx).
- Zoneless mejora performance sin configuración.
- Standalone components reducen boilerplate.

### Negativas

- Angular es más verboso que React o Vue.
- El bundle inicial es más grande (~150 KB vs ~50 KB de React).
- Menos librerías de terceros comparado con React.

### Neutras

- El proyecto está atado al ciclo de releases de Angular (cada 6 meses).
- Las actualizaciones de versión mayor requieren migración (aunque Angular tiene `ng update` que automatiza mucho).

---

## Referencias

- [Angular 21 release notes](https://blog.angular.dev/)
- [Modelo relacional](../data-model/README.md)
- [ADR-005: Estrategia de estado](./ADR-005-estrategia-estado.md)

---

_ADR-001 — Angular 21 como framework frontend_
