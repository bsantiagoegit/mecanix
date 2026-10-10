[← Índice del modelo conceptual](./README.md)

# Descripción de entidades

Ver atributos completos en el [diagrama ERD](./erd.md).

## Tenancy y usuarios

**`workshops`** — El taller. Unidad de aislamiento multi-tenant. Toda tabla de negocio tiene `workshop_id`.

**`users`** — Identidad global. Email único. No tiene rol en sí mismo; el rol vive en `workshop_members`.

**`workshop_members`** — Relación usuario-taller con rol. Un usuario puede estar en N talleres con roles distintos.

**`roles`** — Catálogo de roles (`owner`, `advisor`, `mechanic`). Tabla de referencia, no editable por el taller en MVP.

## Clientes y vehículos

**`customers`** — Cliente del taller. Datos de contacto. Pertenece a un taller. Soft delete.

**`vehicles`** — Vehículo. Independiente del cliente. Pertenece a un taller. Soft delete.

**`vehicle_ownerships`** — Relación temporal vehículo-cliente. `started_at` + `ended_at` nullable. Permite transferencias sin perder historial.

## Órdenes de trabajo

**`work_orders`** — Orden de trabajo. Número único por taller (`OT-YYYY-NNNN`). Estados: `draft`, `received`, `inspecting`, `awaiting_approval`, `approved`, `in_progress`, `awaiting_parts`, `completed`, `delivered`, `cancelled`.

**`vehicle_intakes`** — Estado del vehículo al ingreso. Uno por orden. Foto obligatoria (mínimo configurable).

**`work_iterations`** — Iteración de trabajo. Una orden tiene N iteraciones secuenciales. Cada iteración agrupa inspecciones, diagnósticos, reparaciones y una cotización.

**`work_order_status_history`** — Auditoría de transiciones. Append-only.

## Inspecciones y diagnósticos

**`inspections`** — Inspección dentro de una iteración. Un mecánico responsable. Duración.

**`findings`** — Hallazgo. Pertenece a una inspección. Puede tener múltiples diagnósticos.

**`diagnoses`** — Diagnóstico. Pertenece a un hallazgo. Puede generar múltiples reparaciones recomendadas.

## Reparaciones

**`recommended_repairs`** — Reparación recomendada. Pertenece a una iteración. Puede resolver múltiples hallazgos (vía `repair_findings`).

**`repair_findings`** — Tabla intermedia. Muchos-a-muchos entre reparaciones y hallazgos.

**`approvals`** — Aprobación/rechazo por reparación individual. Registra canal, monto, fecha.

**`performed_repairs`** — Reparación realizada. Puede diferir de la aprobada. Asociada a un mecánico.

**`labor_entries`** — Registro de tiempo por mecánico. Informativo, no afecta costo.

## Items (repuestos e insumos)

**`items_catalog`** — Catálogo de items por taller. Opcional (permite autocompletar).

**`quote_items`** — Items dentro de una cotización. Snapshot (no referencia viva al catálogo).

**`repair_items`** — Items dentro de una reparación. Con estado (`requested`, `received`, `installed`, etc.).

**`suppliers`** — Proveedor. Simple. Nombre, teléfono, contacto.

## Cotizaciones

**`quotes`** — Cotización. Una por iteración. Estados: `draft`, `sent`, `partially_approved`, `approved`, `rejected`, `expired`.

**`quote_items`** — Items de la cotización.

## Garantías y entregas

**`warranties`** — Garantía. Una por orden. Se genera al pasar a `completed`. Cubre mano de obra y repuestos.

**`deliveries`** — Entrega. Una por orden. Registra quién recibe.

## Fotos

**`photos`** — Foto. Relación polimórfica con `entity_type` + `entity_id`. Pertenece a un taller. No se elimina.
