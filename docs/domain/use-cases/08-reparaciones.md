[← Índice de casos de uso](../use-cases.md)

# Feature 8: Reparaciones

| ID        | Caso de uso                                               | Actor             | Prioridad |
| --------- | ------------------------------------------------------------ | ----------------- | --------- |
| UC-REP-01 | Crear reparación recomendada                              | Mechanic          | **MVP**   |
| UC-REP-02 | Asociar reparación a múltiples hallazgos                  | Mechanic          | **MVP**   |
| UC-REP-03 | Asociar repuestos e insumos a una reparación              | Mechanic, Advisor | **MVP**   |
| UC-REP-04 | Editar reparación recomendada (mientras no esté cotizada) | Mechanic          | **MVP**   |
| UC-REP-05 | Aprobar reparación (individual)                           | Advisor           | **MVP**   |
| UC-REP-06 | Rechazar reparación (individual)                          | Advisor           | **MVP**   |
| UC-REP-07 | Iniciar reparación (approved → in_progress)               | Mechanic          | **MVP**   |
| UC-REP-08 | Registrar tiempo de trabajo por mecánico                  | Mechanic          | **MVP**   |
| UC-REP-09 | Marcar reparación como completada                         | Mechanic          | **MVP**   |
| UC-REP-10 | Cancelar reparación (con motivo)                          | Advisor           | **MVP**   |
| UC-REP-11 | Registrar reparación realizada que difiere de la aprobada | Mechanic          | Fase 2    |

## Casos de uso detallados

### UC-REP-01: Crear reparación recomendada

- **Actor**: Mechanic
- **Precondiciones**: Al menos un diagnóstico registrado.
- **Flujo principal**:
  1. Mechanic toca "Agregar reparación recomendada".
  2. Registra descripción.
  3. Selecciona uno o más hallazgos que resuelve (multi-select).
  4. Registra costo estimado.
  5. Registra tiempo estimado (informativo).
  6. Agrega repuestos e insumos necesarios (opcional en este paso).
  7. Guarda la reparación.
- **Flujos alternativos**:
  - **Reparación sin hallazgo asociado**: se permite, pero se advierte.
- **Reglas de negocio**:
  - Una reparación puede resolver múltiples hallazgos.
  - Una reparación puede tener múltiples repuestos e insumos.
  - El costo estimado es obligatorio.
- **Datos involucrados**: `recommended_repairs`, `repair_findings`, `items`.
- **Resultado esperado**: Reparación recomendada, visible en la orden.

### UC-REP-08: Registrar tiempo de trabajo por mecánico

- **Actor**: Mechanic
- **Precondiciones**: Reparación en `in_progress`.
- **Flujo principal**:
  1. Mechanic toca "Registrar tiempo".
  2. Registra minutos trabajados.
  3. Opcionalmente registra notas.
  4. Guarda.
  5. Sistema asocia tiempo al mecánico y a la reparación.
- **Flujos alternativos**:
  - **Múltiples mecánicos**: cada uno registra su tiempo por separado.
- **Reglas de negocio**:
  - El tiempo es informativo, no afecta el costo final.
  - Se puede registrar tiempo parcial (múltiples entradas).
  - El tiempo total se calcula sumando entradas.
- **Datos involucrados**: `labor_entries`, `performed_repairs`, `users`.
- **Resultado esperado**: Tiempo registrado, visible en el detalle de la reparación.
