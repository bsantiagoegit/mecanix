# ADR-005: Estrategia de estado: signals + NgRx selectivo

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

Angular 21 tiene dos mecanismos principales de manejo de estado:

1. **Signals** (nativo): estado local, derivado, reactivo.
2. **NgRx** (librería): estado global, con actions, reducers, effects, selectors.

El error común es **usar NgRx para todo** o **no usar NgRx para nada**. Ambos extremos son malos:

- **NgRx para todo**: sobrecarga. Formularios simples, estado de un componente, dialogs.
- **NgRx para nada**: cuando el estado se comparte entre features (sesión, taller activo), se duplica lógica.

Además, el proyecto tiene:

- Estado global real (sesión, taller activo, catálogos).
- Estado derivado complejo (lista de órdenes filtrada, dashboard).
- Estado efímero (modales, formularios en progreso).
- Server state (datos de Supabase).

---

## Decisión

**Estrategia híbrida**:

- **Signals** para:
  - Estado local de componentes.
  - Estado derivado (`computed`).
  - Estado efímero (modales, formularios).
  - Estado por feature (caché de lista de clientes, etc.).

- **NgRx** solo para:
  - Sesión de usuario (`auth`).
  - Taller activo (`activeWorkshop`).
  - Catálogos globales (`roles`, estados de orden).
  - Estado que debe persistir entre rutas.

- **`resource` / `httpResource`** (Angular 21) para data fetching reactivo desde Supabase.

- **Data services** (servicios Angular) para acceso a Supabase. Los componentes no llaman a Supabase directamente.

- **Facades** solo cuando aportan valor (no como wrapper vacío del store).

---

## Alternativas consideradas

### Alternativa A: NgRx para todo

- **Descripción**: todas las entidades van al store global.
- **Ventajas**: un solo lugar para todo el estado. DevTools potente.
- **Desventajas**: boilerplate masivo (actions, reducers, effects, selectors por entidad). El store se vuelve un contenedor universal. Difícil de mantener.
- **Razón de descarte**: overengineering. La mayoría del estado es local o efímero.

### Alternativa B: Sin NgRx, solo signals + servicios

- **Descripción**: todo el estado con signals y servicios.
- **Ventajas**: menos boilerplate, más simple.
- **Desventajas**: el estado compartido entre features se duplica o se gestiona con servicios complejos. No hay DevTools.
- **Razón de descarte**: el estado global real (sesión, taller activo) merece NgRx.

### Alternativa C: Solo signals, sin NgRx

- **Descripción**: signals + servicios + `effect` para sincronización.
- **Ventajas**: moderno, sin dependencias.
- **Desventajas**: no hay un patrón claro para acciones asíncronas complejas. Los effects de NgRx son más estructurados.
- **Razón de descarte**: NgRx sigue siendo la mejor opción para estado global con efectos asíncronos.

### Alternativa D: NgRx Signal Store

- **Descripción**: versión moderna de NgRx basada en signals.
- **Ventajas**: menos boilerplate que NgRx clásico, integración nativa con signals.
- **Desventajas**: más nuevo, menos documentación. API puede cambiar.
- **Razón de descarte**: por ahora, NgRx clásico + signals nativos. Si NgRx Signal Store se estabiliza, se evalúa en Fase 2.

---

## Consecuencias

### Positivas

- Menos código que "NgRx para todo".
- Estado local más simple con signals.
- Estado global con patrones claros (NgRx).
- Data fetching reactivo con `resource`.
- Data services como capa única de acceso a Supabase.

### Negativas

- Requiere disciplina: ¿qué va en signals? ¿qué va en NgRx?
- El desarrollador debe conocer ambos mecanismos.
- Curva de aprendizaje para quien solo conozca uno.

### Neutras

- El store global tiene pocas slices (~3): `auth`, `workshops`, `catalogs`.
- Las features manejan su propio estado local.

---

## Referencias

- [Angular signals](https://angular.dev/guide/signals)
- [NgRx](https://ngrx.io/)
- [Estado de features](./ADR-001-angular-21.md)

---

_ADR-005 — Estrategia de estado: signals + NgRx selectivo_
