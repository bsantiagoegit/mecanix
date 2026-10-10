[← Índice de casos de uso](../use-cases.md)

# Feature 6: Inspecciones y Hallazgos

| ID         | Caso de uso                                              | Actor    | Prioridad |
| ---------- | ---------------------------------------------------------- | -------- | --------- |
| UC-INSP-01 | Crear inspección                                         | Mechanic | **MVP**   |
| UC-INSP-02 | Registrar hallazgo en inspección                         | Mechanic | **MVP**   |
| UC-INSP-03 | Adjuntar fotos a un hallazgo                             | Mechanic | **MVP**   |
| UC-INSP-04 | Editar hallazgo (mientras la inspección no esté cerrada) | Mechanic | **MVP**   |
| UC-INSP-05 | Cerrar inspección                                        | Mechanic | **MVP**   |
| UC-INSP-06 | Ver inspecciones de una orden                            | Todos    | **MVP**   |

## Casos de uso detallados

### UC-INSP-02: Registrar hallazgo en inspección

- **Actor**: Mechanic
- **Precondiciones**: Inspección activa.
- **Flujo principal**:
  1. Mechanic toca "Agregar hallazgo".
  2. Registra descripción (texto libre).
  3. Opcionalmente adjunta fotos.
  4. Guarda el hallazgo.
  5. Sistema asocia hallazgo a la inspección.
- **Flujos alternativos**:
  - **Hallazgo duplicado**: sistema sugiere hallazgos similares existentes.
- **Reglas de negocio**:
  - Un hallazgo pertenece a una sola inspección.
  - Un hallazgo puede tener múltiples diagnósticos (después).
  - Un hallazgo puede tener múltiples fotos.
- **Datos involucrados**: `findings`, `photos`, `inspections`.
- **Resultado esperado**: Hallazgo registrado, visible en la inspección.
