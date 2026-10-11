# ADR-007: Orden de trabajo con iteraciones

- **Estado:** ✅ Aceptado
- **Fecha:** 2026-10
- **Decisores:** Tech Lead, Desarrollador
- **Supersede:** —
- **Superseded por:** —

---

## Contexto

En un taller mecánico real, el trabajo no es lineal:

1. El cliente llega con un problema reportado.
2. El mecánico inspecciona.
3. Encuentra hallazgos.
4. Diagnostica.
5. Cotiza reparaciones.
6. El cliente aprueba.
7. Se repara.
8. **A veces, al desmontar, se descubre un problema nuevo.**
9. Se cotiza de nuevo.
10. El cliente aprueba (o rechaza).
11. Se repara.
12. Y así sucesivamente.

En un caso real, un cliente puede tener 2-3 iteraciones de "hallazgo → diagnóstico → cotización → aprobación → reparación" en una misma orden.

Dos opciones de modelado:

1. **Orden monolítica**: una orden con todos los hallazgos, diagnósticos y reparaciones mezclados.
2. **Orden con iteraciones**: cada iteración agrupa los hallazgos, diagnósticos, reparaciones y cotización de un ciclo.

---

## Decisión

Modelar la orden de trabajo como una entidad que contiene **iteraciones** (`work_iterations`). Cada iteración agrupa:

- Inspecciones.
- Hallazgos.
- Diagnósticos.
- Reparaciones recomendadas.
- Cotización.

Las iteraciones son **secuenciales**: una debe cerrarse (aprobada o rechazada) antes de iniciar la siguiente.

---

## Alternativas consideradas

### Alternativa A: Orden monolítica sin iteraciones

- **Descripción**: todos los hallazgos, diagnósticos y reparaciones viven en la orden, sin agrupar.
- **Ventajas**: menos tablas. Modelo más simple.
- **Desventajas**: no hay forma de saber qué hallazgos corresponden a qué cotización. Si el cliente aprueba la iteración 1 y rechaza la 2, no hay estructura para modelarlo.
- **Razón de descarte**: no refleja la realidad del taller.

### Alternativa B: Sub-órdenes

- **Descripción**: cada iteración es una nueva orden vinculada a la original.
- **Ventajas**: cada iteración es independiente.
- **Desventajas**: duplica cliente, vehículo, asesor en cada sub-orden. La numeración se complica.
- **Razón de descarte**: la iteración no es una orden nueva, es un ciclo dentro de la misma orden.

### Alternativa C: Iteraciones como campo `iteration_number`

- **Descripción**: agregar `iteration_number` a `inspections`, `recommended_repairs`, `quotes`.
- **Ventajas**: menos tablas.
- **Desventajas**: no hay una entidad que agrupe "este ciclo de trabajo". Difícil saber qué inspección corresponde a qué cotización.
- **Razón de descarte**: la entidad `work_iterations` es necesaria para agrupar.

---

## Consecuencias

### Positivas

- Refleja la realidad del taller (casos reales tienen múltiples iteraciones).
- Cada iteración tiene su propio ciclo de aprobación.
- El cliente aprueba reparaciones por iteración, no por orden completa.
- Los reportes pueden medir "cuántas iteraciones tiene una orden promedio".

### Negativas

- Una tabla más (`work_iterations`).
- Las queries se complican (JOINs adicionales).
- El frontend debe manejar el concepto de "iteración activa".

### Neutras

- Si un taller nunca tiene iteraciones múltiples, siempre habrá una sola iteración por orden.
- El modelo escala tanto para talleres simples como complejos.

---

## Referencias

- [Glosario: Iteración de trabajo](../../domain/glossary.md)
- [Modelo conceptual](../../domain/conceptual-model/README.md)
- [Modelo relacional: Work Orders](../data-model/tables/03-work-orders.md)
- [Diagrama de estados](../../domain/state-machine.md)

---

_ADR-007 — Orden de trabajo con iteraciones_
