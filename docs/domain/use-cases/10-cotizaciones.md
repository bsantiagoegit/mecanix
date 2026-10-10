[← Índice de casos de uso](../use-cases.md)

# Feature 10: Cotizaciones

| ID          | Caso de uso                                              | Actor          | Prioridad |
| ----------- | ------------------------------------------------------------ | -------------- | --------- |
| UC-QUOTE-01 | Generar cotización a partir de reparaciones recomendadas | Advisor        | **MVP**   |
| UC-QUOTE-02 | Ver cotización                                           | Advisor, Owner | **MVP**   |
| UC-QUOTE-03 | Enviar cotización al cliente (WhatsApp/email)            | Advisor        | **MVP**   |
| UC-QUOTE-04 | Registrar aprobación/rechazo del cliente por reparación  | Advisor        | **MVP**   |
| UC-QUOTE-05 | Extender fecha de expiración de cotización               | Advisor        | Fase 2    |
| UC-QUOTE-06 | Ver cotizaciones expiradas                               | Advisor        | Fase 2    |
| UC-QUOTE-07 | Regenerar cotización (nueva iteración)                   | Advisor        | **MVP**   |

## Casos de uso detallados

### UC-QUOTE-01: Generar cotización a partir de reparaciones recomendadas

- **Actor**: Advisor
- **Precondiciones**: Al menos una reparación recomendada, al menos un diagnóstico.
- **Flujo principal**:
  1. Advisor abre la orden.
  2. Toca "Generar cotización".
  3. Sistema agrupa todas las reparaciones recomendadas no cotizadas.
  4. Sistema calcula total estimado (reparaciones + repuestos + insumos).
  5. Advisor revisa y ajusta si es necesario.
  6. Advisor confirma la cotización.
  7. Sistema crea entidad `quote` con estado `draft`.
  8. Sistema asigna fecha de expiración (default 7 días).
- **Flujos alternativos**:
  - **Cotización parcial**: el advisor puede seleccionar solo algunas reparaciones.
- **Reglas de negocio**:
  - Una cotización agrupa reparaciones de una misma iteración.
  - Una cotización puede tener múltiples iteraciones si se regenera.
  - La cotización expira a los N días configurados por taller.
- **Datos involucrados**: `quotes`, `quote_items`, `recommended_repairs`.
- **Resultado esperado**: Cotización en `draft`, lista para enviar al cliente.

### UC-QUOTE-04: Registrar aprobación/rechazo del cliente por reparación

- **Actor**: Advisor
- **Precondiciones**: Cotización enviada al cliente, cliente respondió.
- **Flujo principal**:
  1. Advisor abre la cotización.
  2. Para cada reparación, registra la decisión: aprobada o rechazada.
  3. Registra el canal (presencial, teléfono, WhatsApp).
  4. Registra notas (opcional).
  5. Guarda.
  6. Sistema crea entidades `approval` por cada reparación.
  7. Sistema actualiza estado de la cotización.
  8. Sistema actualiza estado de la orden.
- **Flujos alternativos**:
  - **Cliente no responde**: la cotización queda `sent` hasta que expire.
- **Reglas de negocio**:
  - La aprobación es por reparación individual.
  - El monto aprobado se registra por reparación.
  - El canal es obligatorio.
- **Datos involucrados**: `approvals`, `quotes`, `recommended_repairs`, `work_orders`.
- **Resultado esperado**: Aprobaciones registradas, orden en `approved` o `cancelled`.
