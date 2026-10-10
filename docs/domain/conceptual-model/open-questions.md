[← Índice del modelo conceptual](./README.md)

# Preguntas abiertas, alternativas y riesgos

## Preguntas abiertas

Estas impactan el modelo relacional. Se resuelven en el siguiente entregable o con validación del taller.

1. **¿`work_iterations` es necesario?** Si el taller nunca tiene múltiples iteraciones, se puede eliminar. Recomendación: mantener porque tu caso real tuvo 2 iteraciones.
2. **¿`repair_items` es necesario o se puede usar `quote_items`?** Recomendación: mantener separadas porque `repair_items` tiene estado mutable y `quote_items` es snapshot inmutable.
3. **¿`items_catalog` es necesario en MVP?** Recomendación: sí, útil para autocompletar.
4. **¿`suppliers` es necesario en MVP?** Sí, pero simple (solo nombre y teléfono).
5. **¿`photos` tiene `workshop_id` redundante?** Sí, pero necesario para RLS sin JOIN.
6. **¿La relación polimórfica de `photos` es problemática?** Un poco. No hay FK que garantice integridad. Alternativa: FKs nullable. Recomendación: mantener polimórfica con CHECK constraint.
7. **¿`work_order_status_history` tiene `workshop_id`?** No, se deriva vía `work_order_id`. Recomendación: no agregar para evitar redundancia.
8. **¿`approvals` puede tener múltiples entradas por reparación?** Sí, si el cliente cambia de opinión. La última es la válida.
9. **¿`labor_entries` puede tener entradas de múltiples mecánicos?** Sí. Cada mecánico registra su tiempo.
10. **¿`warranties` puede tener múltiples garantías por orden?** En MVP, una. Si el taller da garantías parciales por reparación, se extiende.

## Alternativas consideradas

**Alternativa A: Sin `work_iterations`**
Eliminar `work_iterations` y agregar `iteration_number` a `inspections`, `recommended_repairs`, `quotes`.

- **Ventaja**: menos tablas.
- **Desventaja**: no hay una entidad que agrupe "este ciclo de trabajo".

**Alternativa B: Sin `repair_findings`**
Asumir 1:1 entre reparación y hallazgo.

- **Ventaja**: menos tablas.
- **Desventaja**: contradice el caso real (una reparación resolvió múltiples hallazgos).

**Alternativa C: Sin `photos` polimórfica**
FKs nullable para cada entidad.

- **Ventaja**: integridad referencial garantizada.
- **Desventaja**: muchas columnas nullable, difícil de mantener.

**Recomendación**: mantener el modelo propuesto.

## Trade-offs

**Ganamos:**

- Modelo que refleja la realidad del taller.
- Base sólida para RLS multi-tenant.
- Trazabilidad completa del ciclo de vida.
- Flexibilidad para evolucionar.

**Perdemos:**

- 20 tablas. Es mucho para un MVP.
- Complejidad en queries (múltiples JOINs).
- Más código de RLS.

## Riesgos

1. **Sobre-modelar**: 20 tablas puede ser demasiado. Mitigación: validar con el taller antes de implementar.
2. **RLS complejo**: 20 tablas con RLS por `workshop_id`. Mitigación: funciones SQL reutilizables.
3. **Relación polimórfica de `photos`**: no hay integridad referencial. Mitigación: CHECK constraint + validación en RPC.
4. **Performance**: muchas tablas + muchos JOINs. Mitigación: índices en FKs. Para 4 carros/día, no es problema.
