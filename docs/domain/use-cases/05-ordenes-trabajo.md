[← Índice de casos de uso](../use-cases.md)

# Feature 5: Órdenes de Trabajo

| ID       | Caso de uso                                                      | Actor          | Prioridad |
| -------- | ----------------------------------------------------------------- | -------------- | --------- |
| UC-WO-01 | Crear orden de trabajo (draft)                                   | Advisor        | **MVP**   |
| UC-WO-02 | Confirmar recepción de vehículo (draft → received)               | Advisor        | **MVP**   |
| UC-WO-03 | Registrar estado de ingreso (intake) con fotos obligatorias      | Advisor        | **MVP**   |
| UC-WO-04 | Ver listado de órdenes (con filtros por estado, fecha, mecánico) | Todos          | **MVP**   |
| UC-WO-05 | Ver detalle de orden                                             | Todos          | **MVP**   |
| UC-WO-06 | Iniciar inspección (received → inspecting)                       | Mechanic       | **MVP**   |
| UC-WO-07 | Pausar inspección (inspecting → received)                        | Mechanic       | Fase 2    |
| UC-WO-08 | Registrar problema reportado por el cliente                      | Advisor        | **MVP**   |
| UC-WO-09 | Cancelar orden                                                   | Owner, Advisor | **MVP**   |
| UC-WO-10 | Ver historial de transiciones de estado                          | Owner          | Fase 2    |
| UC-WO-11 | Reabrir orden (dentro de 24h de completed)                       | Owner          | Fase 2    |
| UC-WO-12 | Cerrar orden (in_progress → completed)                           | Mechanic       | **MVP**   |
| UC-WO-13 | Entregar vehículo (completed → delivered)                        | Advisor        | **MVP**   |
| UC-WO-14 | Imprimir/exportar orden de trabajo                               | Todos          | Fase 2    |

## Casos de uso detallados

### UC-WO-01: Crear orden de trabajo (draft)

- **Actor**: Advisor
- **Precondiciones**: Usuario autenticado, rol `advisor` u `owner` en el taller activo.
- **Flujo principal**:
  1. Advisor navega a "Nueva orden".
  2. Selecciona cliente existente o crea uno nuevo.
  3. Selecciona vehículo del cliente o crea uno nuevo.
  4. Registra problema reportado (texto libre).
  5. Guarda la orden como `draft`.
  6. Sistema asigna número temporal y registra `created_by`, `created_at`.
- **Flujos alternativos**:
  - **Cliente no existe**: se crea inline sin salir del flujo.
  - **Vehículo no existe**: se crea inline sin salir del flujo.
  - **Capacidad del taller llena**: advertencia, pero se permite crear el draft (no ocupa capacidad hasta `received`).
- **Reglas de negocio**:
  - No se puede crear una orden sin cliente y vehículo.
  - El número definitivo se asigna al confirmar (T-01), no al crear el draft.
- **Datos involucrados**: `work_orders`, `customers`, `vehicles`, `vehicle_ownerships`.
- **Resultado esperado**: Orden en estado `draft`, visible en el listado del advisor, no visible para mecánicos.

### UC-WO-02: Confirmar recepción de vehículo (draft → received)

- **Actor**: Advisor
- **Precondiciones**: Orden en estado `draft`, intake completo (incluye mínimo de fotos configurado).
- **Flujo principal**:
  1. Advisor abre la orden en `draft`.
  2. Completa el intake: estado de rayones, golpes, llantas, vidrios, pertenencias.
  3. Toma mínimo 4 fotos (frente, atrás, lados).
  4. Confirma la recepción.
  5. Sistema valida: intake completo + fotos suficientes.
  6. Sistema asigna número definitivo (`OT-YYYY-NNNN`).
  7. Sistema cambia estado a `received`.
  8. Sistema registra transición en `work_order_status_history`.
  9. Sistema notifica a mecánicos (opcional, Fase 2).
- **Flujos alternativos**:
  - **Fotos insuficientes**: sistema bloquea la transición y muestra cuántas faltan.
  - **Capacidad llena**: sistema bloquea si ya hay N órdenes activas en el taller.
- **Reglas de negocio**:
  - Mínimo de fotos configurable por taller (default 4).
  - Capacidad máxima de vehículos simultáneos configurable (default 4).
  - El número de orden es único por taller.
- **Datos involucrados**: `work_orders`, `vehicle_intakes`, `photos`, `workshops`.
- **Resultado esperado**: Orden en `received`, número asignado, visible para mecánicos.

### UC-WO-06: Iniciar inspección (received → inspecting)

- **Actor**: Mechanic
- **Precondiciones**: Orden en `received`, mecánico asignado o disponible.
- **Flujo principal**:
  1. Mechanic abre la orden.
  2. Toca "Iniciar inspección".
  3. Sistema cambia estado a `inspecting`.
  4. Sistema crea entidad `inspection` asociada a la orden.
  5. Sistema registra timestamp de inicio.
- **Flujos alternativos**:
  - **Ya hay una inspección en curso**: sistema muestra la existente.
- **Reglas de negocio**:
  - Una orden solo puede tener una inspección activa a la vez.
  - El mecánico que inicia la inspección queda como responsable (puede cambiarse).
- **Datos involucrados**: `work_orders`, `inspections`.
- **Resultado esperado**: Inspección creada, orden en `inspecting`.

### UC-WO-12: Cerrar orden (in_progress → completed)

- **Actor**: Mechanic
- **Precondiciones**: Todas las reparaciones aprobadas están realizadas.
- **Flujo principal**:
  1. Mechanic toca "Cerrar orden".
  2. Sistema valida que no haya reparaciones pendientes.
  3. Mechanic confirma.
  4. Sistema cambia estado a `completed`.
  5. Sistema genera garantía automáticamente con fecha de vencimiento configurable.
  6. Sistema registra timestamp de cierre.
- **Flujos alternativos**:
  - **Reparaciones pendientes**: sistema bloquea y muestra cuáles faltan.
  - **Cliente quiere recoger sin algunas reparaciones**: se cancelan esas reparaciones primero.
- **Reglas de negocio**:
  - No se puede cerrar con reparaciones aprobadas sin realizar.
  - La garantía se genera automáticamente.
  - La fecha de vencimiento de garantía es configurable por taller (default 14 días).
- **Datos involucrados**: `work_orders`, `warranties`, `performed_repairs`.
- **Resultado esperado**: Orden en `completed`, garantía creada.

### UC-WO-13: Entregar vehículo (completed → delivered)

- **Actor**: Advisor
- **Precondiciones**: Orden en `completed`.
- **Flujo principal**:
  1. Advisor abre la orden.
  2. Toca "Entregar vehículo".
  3. Registra quién recibe (nombre, identificación).
  4. Confirma entrega (checkbox o firma digital, MVP: checkbox).
  5. Sistema cambia estado a `delivered`.
  6. Sistema registra timestamp de entrega.
- **Flujos alternativos**:
  - **Cliente no puede recoger**: la orden queda en `completed` indefinidamente.
- **Reglas de negocio**:
  - `delivered` es terminal.
  - No se puede entregar sin que la orden esté `completed`.
  - El nombre de quien recibe es obligatorio.
- **Datos involucrados**: `work_orders`, `deliveries`.
- **Resultado esperado**: Orden en `delivered`, historial cerrado.
