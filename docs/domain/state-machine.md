# Transiciones de Estado — Orden de Trabajo

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026
- **Total de transiciones:** 18
- **Estados:** 9 + 2 terminales

---

## Estados de la Orden

| Estado | Descripción |
|---|---|
| `draft` | Borrador. Creada pero no confirmada. |
| `received` | Vehículo recibido. Intake completo. |
| `inspecting` | Inspección en curso. |
| `awaiting_approval` | Esperando aprobación del cliente. |
| `approved` | Cliente aprobó al menos una reparación. |
| `in_progress` | Reparaciones en curso. |
| `awaiting_parts` | Esperando llegada de repuestos. |
| `completed` | Todas las reparaciones realizadas. |
| `delivered` | Vehículo entregado al cliente. |
| `cancelled` | Orden cancelada (terminal). |

**Estados terminales:** `delivered` y `cancelled`. No pueden volver a estados anteriores.

---

## Tabla de Transiciones

| ID | Origen | Destino | Actor | Precondiciones | Postcondiciones |
|---|---|---|---|---|---|
| T-01 | `draft` | `received` | Asesor | Intake completo + mínimo 4 fotos + vehículo + cliente registrados | Orden confirmada, número asignado, notificación a mecánicos |
| T-02 | `draft` | `cancelled` | Asesor | Sin restricciones | Orden cancelada con motivo "borrador descartado" |
| T-03 | `received` | `inspecting` | Mecánico | Orden confirmada | Inspección iniciada, timestamp registrado |
| T-04 | `inspecting` | `awaiting_approval` | Mecánico | Al menos 1 hallazgo + 1 diagnóstico + 1 reparación recomendada | Cotización generada, notificación al asesor |
| T-05 | `inspecting` | `received` | Mecánico | Sin restricciones | Inspección pausada, motivo registrado |
| T-06 | `awaiting_approval` | `approved` | Asesor | Al menos 1 reparación aprobada por el cliente | Aprobaciones registradas, cotización actualizada |
| T-07 | `awaiting_approval` | `cancelled` | Asesor | Cotización expirada O todas las reparaciones rechazadas | Orden cancelada con motivo |
| T-08 | `awaiting_approval` | `inspecting` | Mecánico | Nuevo hallazgo detectado | Nueva iteración iniciada |
| T-09 | `approved` | `in_progress` | Asesor o Mecánico | Repuestos disponibles (si aplica) | Reparaciones iniciadas |
| T-10 | `approved` | `awaiting_parts` | Asesor o Mecánico | Faltan repuestos | Estado actualizado, fecha estimada de llegada registrada |
| T-11 | `approved` | `cancelled` | Asesor | Motivo obligatorio | Orden cancelada |
| T-12 | `awaiting_parts` | `in_progress` | Asesor o Mecánico | Repuestos recibidos | Reparaciones iniciadas |
| T-13 | `awaiting_parts` | `cancelled` | Asesor | Motivo obligatorio | Orden cancelada |
| T-14 | `in_progress` | `completed` | Mecánico | Todas las reparaciones aprobadas realizadas | Orden lista para entrega, garantía generada |
| T-15 | `in_progress` | `awaiting_approval` | Mecánico | Nuevo hallazgo detectado | Nueva iteración iniciada |
| T-16 | `in_progress` | `awaiting_parts` | Mecánico | Faltan repuestos adicionales | Estado actualizado |
| T-17 | `in_progress` | `cancelled` | Asesor | Motivo obligatorio | Orden cancelada |
| T-18 | `completed` | `delivered` | Asesor | Firma o confirmación de entrega | Orden entregada, historial cerrado |

---

## Reglas Transversales

| ID | Regla |
|---|---|
| RT-01 | Solo `owner` y `advisor` pueden cancelar órdenes. El `mechanic` no puede cancelar. |
| RT-02 | Toda cancelación requiere motivo obligatorio (texto libre, mínimo 10 caracteres). |
| RT-03 | La transición se valida en PostgreSQL vía RPC. El frontend nunca hace UPDATE directo a `work_orders.status`. |
| RT-04 | Cada transición queda en tabla de auditoría (`work_order_status_history`) con: origen, destino, actor, timestamp, motivo, metadata. |
| RT-05 | La garantía se genera automáticamente al pasar a `completed` (trigger en PostgreSQL). |
| RT-06 | Las iteraciones son secuenciales. Una debe cerrarse antes de iniciar la siguiente. |
| RT-07 | Cotización expira a los 7 días (configurable). Al expirar, la orden pasa a `cancelled`. |
| RT-08 | Órdenes con más de X días en el mismo estado generan alerta visual en el dashboard. |
| RT-09 | Reapertura de orden solo permitida dentro de las primeras 24 horas desde `completed`, con auditoría. |
| RT-10 | El estado `delivered` es terminal. No se puede reabrir. Si el cliente vuelve, se crea nueva orden. |

---

*Transiciones de Estado — Orden de Trabajo v1.0*
*Documento vivo. Próxima revisión al cierre de casos de uso.*