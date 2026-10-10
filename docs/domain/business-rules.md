# Reglas de Negocio Transversales

Reglas que aplican a múltiples casos de uso. Cada una tiene un ID estable (`RT-NN`) para referenciarla desde el código y los tests.

## RT-01: Cancelación de órdenes

Solo `owner` y `advisor` pueden cancelar órdenes. El `mechanic` no puede cancelar.

**Implementación**: RLS policy + validación en RPC.
**Test**: `work-orders/rt-01-cancellation.spec.ts`

## RT-02: Motivo obligatorio en cancelación

Toda cancelación requiere motivo obligatorio (texto libre, mínimo 10 caracteres).

**Implementación**: CHECK constraint en `work_orders.cancellation_reason` + validación en frontend.
**Test**: `work-orders/rt-02-cancellation-reason.spec.ts`

## RT-03: Validación de transiciones en backend

La transición de estado se valida en PostgreSQL vía RPC. El frontend nunca hace UPDATE directo a `work_orders.status`.

**Implementación**: RPC `transition_work_order(work_order_id, new_status, reason)`.
**Test**: `work-orders/rt-03-transition-rpc.spec.ts`

## RT-04: Auditoría de transiciones

Cada transición queda registrada en `work_order_status_history` con: origen, destino, actor, timestamp, motivo, metadata.

**Implementación**: trigger en `work_orders` que inserta en `work_order_status_history`.
**Test**: `work-orders/rt-04-status-history.spec.ts`

## RT-05: Garantía automática al completar

La garantía se genera automáticamente al pasar a `completed`.

**Implementación**: trigger en `work_orders` que inserta en `warranties`.
**Test**: `work-orders/rt-05-warranty-auto.spec.ts`

## RT-06: Iteraciones secuenciales

Las iteraciones son secuenciales. Una debe cerrarse antes de iniciar la siguiente.

**Implementación**: validación en RPC al crear una nueva iteración.
**Test**: `work-orders/rt-06-sequential-iterations.spec.ts`

## RT-07: Expiración de cotización

Cotización expira a los 7 días (configurable por taller). Al expirar, la orden pasa a `cancelled`.

**Implementación**: cron job (GitHub Actions en free tier, pg_cron en Pro) que llama a RPC `expire_quotes()`.
**Test**: `quotes/rt-07-quote-expiration.spec.ts`

## RT-08: Alerta de órdenes estancadas

Órdenes con más de X días en el mismo estado generan alerta visual en el dashboard.

**Implementación**: vista SQL `stalled_work_orders` + componente en dashboard.
**Test**: `reports/rt-08-stalled-orders.spec.ts`

## RT-09: Reapertura de orden

Reapertura de orden solo permitida dentro de las primeras 24 horas desde `completed`, con auditoría.

**Implementación**: RPC `reopen_work_order(work_order_id, reason)`.
**Test**: `work-orders/rt-09-reopen.spec.ts`

## RT-10: Estado delivered es terminal

El estado `delivered` es terminal. No se puede reabrir. Si el cliente vuelve, se crea nueva orden.

**Implementación**: constraint en transiciones válidas + validación en RPC.
**Test**: `work-orders/rt-10-terminal-state.spec.ts`

## Reglas adicionales del dominio

### RT-11: Fotos obligatorias en intake

Cada orden debe tener al menos N fotos de intake (default 4, configurable por taller).

**Implementación**: validación en RPC `confirm_work_order_reception()`.
**Test**: `work-orders/rt-11-intake-photos.spec.ts`

### RT-12: Capacidad máxima del taller

No se puede confirmar recepción si el taller ya tiene N órdenes activas (default 4, configurable).

**Implementación**: validación en RPC `confirm_work_order_reception()`.
**Test**: `work-orders/rt-12-capacity.spec.ts`

### RT-13: Número de orden único por taller

El número de orden (`OT-YYYY-NNNN`) es único por taller.

**Implementación**: unique constraint `(workshop_id, sequence_number)` + trigger para asignar secuencia.
**Test**: `work-orders/rt-13-unique-number.spec.ts`

### RT-14: Aprobación por reparación individual

La aprobación es por reparación individual, no por cotización completa.

**Implementación**: tabla `approvals` con FK a `recommended_repairs`.
**Test**: `quotes/rt-14-individual-approval.spec.ts`

### RT-15: Vehículo independiente del cliente

El vehículo es independiente del cliente. La relación es temporal (`vehicle_ownerships`).

**Implementación**: tabla `vehicle_ownerships` con `started_at` y `ended_at`.
**Test**: `vehicles/rt-15-ownership.spec.ts`
