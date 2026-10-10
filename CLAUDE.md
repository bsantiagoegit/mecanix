# CLAUDE.md

Instrucciones para Claude Code en este repo. La fuente de verdad ampliada vive en `.ai/` y `docs/domain/` — este archivo es el punto de entrada que Claude Code carga automáticamente.

## Antes de escribir código

1. `.ai/CONTEXT.md` — dominio condensado (actores, flujo principal, estados, stack).
2. `docs/domain/glossary.md` — lenguaje ubicuo. No inventar términos.
3. `docs/domain/use-cases/` — qué se construye (índice en `use-cases.md` dentro de esa carpeta, un archivo por feature).
4. `docs/domain/state-machine.md` — ciclo de vida de una orden de trabajo.
5. `.ai/AGENTS.md` — orden de implementación y reglas de trabajo completas.
6. `.ai/CONVENTIONS.md` — nombres, estructura de feature, commits, reglas TypeScript.
7. `.ai/WORKFLOW.md` — pasos concretos para implementar un caso de uso o tocar el modelo de datos.

## Reglas duras (no negociables)

- NO inventar términos: usa `docs/domain/glossary.md`.
- NO modificar la base de datos sin actualizar `docs/architecture/data-model.md`.
- NO añadir dependencias sin un ADR en `docs/architecture/adr/`.
- NO usar NgRx para estado local — usa signals. NgRx solo para estado global.
- NO llamar a Supabase desde componentes — usa data services.
- Sigue las convenciones de `.ai/CONVENTIONS.md` (nombres, estructura de carpetas, commits).

## Orden de implementación

1. Auth
2. Onboarding de taller
3. Clientes
4. Vehículos
5. Órdenes de trabajo
6. Resto de features

## Cómo referenciar el dominio

- Caso de uso: `UC-WO-01`
- Regla de negocio: `RT-01`
- Transición de estado: `T-01`
- Decisión de arquitectura: `ADR-001`

## Stack

Angular 21, standalone components, signals, NgRx (solo estado global), Tailwind. Supabase: PostgreSQL, Auth, Storage, RLS, RPC. PWA online-first con tolerancia a fallos.
