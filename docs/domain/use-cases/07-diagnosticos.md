[← Índice de casos de uso](../use-cases.md)

# Feature 7: Diagnósticos

| ID         | Caso de uso                                    | Actor    | Prioridad |
| ---------- | ------------------------------------------------ | -------- | --------- |
| UC-DIAG-01 | Registrar diagnóstico para un hallazgo         | Mechanic | **MVP**   |
| UC-DIAG-02 | Editar diagnóstico (mientras no esté aprobado) | Mechanic | **MVP**   |
| UC-DIAG-03 | Ver diagnósticos de una orden                  | Todos    | **MVP**   |
| UC-DIAG-04 | Adjuntar fotos a un diagnóstico                | Mechanic | Fase 2    |

## Casos de uso detallados

### UC-DIAG-01: Registrar diagnóstico para un hallazgo

- **Actor**: Mechanic
- **Precondiciones**: Hallazgo registrado.
- **Flujo principal**:
  1. Mechanic abre el hallazgo.
  2. Toca "Agregar diagnóstico".
  3. Registra descripción técnica (texto libre).
  4. Opcionalmente adjunta fotos.
  5. Guarda el diagnóstico.
- **Flujos alternativos**:
  - **Múltiples diagnósticos**: se permite agregar más de uno por hallazgo.
- **Reglas de negocio**:
  - Un diagnóstico pertenece a un solo hallazgo.
  - Un diagnóstico puede generar múltiples reparaciones recomendadas.
- **Datos involucrados**: `diagnoses`, `findings`, `photos`.
- **Resultado esperado**: Diagnóstico registrado, visible en el hallazgo.
