[← Índice de casos de uso](../use-cases.md)

# Feature 4: Vehículos

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.1
- **Fecha:** Octubre 2026
- **Feature ID:** `04`
- **Prefijo de casos de uso:** `UC-VEH`

---

## Objetivo

Registrar y gestionar los vehículos que ingresan al taller. El vehículo es una entidad independiente del cliente (la relación es temporal vía `vehicle_ownerships`), y persiste entre visitas. Cada vehículo tiene su propio historial de órdenes.

---

## Actores

| Actor    | Rol en este feature                                                 |
| -------- | ------------------------------------------------------------------- |
| Advisor  | Crea, edita y busca vehículos                                       |
| Owner    | Puede hacer todo lo que hace el Advisor, más eliminar (soft delete) |
| Mechanic | Solo busca y ve vehículos (no crea ni edita)                        |

---

## Dependencias

- **Requiere**: `03-clientes.md` (un vehículo se asocia a un cliente vía `vehicle_ownerships`).
- **Requerido por**: `05-ordenes-trabajo.md` (una orden necesita un vehículo).

---

## Casos de uso

| ID        | Caso de uso                                      | Actor   | Prioridad |
| --------- | ------------------------------------------------ | ------- | --------- |
| UC-VEH-01 | Registrar vehículo 🆕                            | Advisor | **MVP**   |
| UC-VEH-02 | Buscar vehículo por placa o VIN                  | Todos   | **MVP**   |
| UC-VEH-03 | Ver detalle de vehículo 🆕                       | Todos   | **MVP**   |
| UC-VEH-04 | Editar vehículo 🆕                               | Advisor | **MVP**   |
| UC-VEH-05 | Ver historial completo de órdenes de un vehículo | Todos   | **MVP**   |
| UC-VEH-06 | Registrar transferencia de propiedad             | Advisor | Fase 2    |
| UC-VEH-07 | Eliminar vehículo (soft delete)                  | Owner   | Fase 2    |

---

## UC-VEH-01: Registrar vehículo

- **Actor**: Advisor
- **Prioridad**: MVP
- **Precondiciones**:
  - Usuario autenticado con rol `advisor` u `owner` en el taller activo.
  - Existe al menos un cliente registrado (o se crea inline).
- **Flujo principal**:
  1. Advisor navega a "Nuevo vehículo" (o crea el vehículo inline desde el flujo de nueva orden).
  2. Ingresa datos obligatorios: placa, marca, modelo, año.
  3. Opcionalmente ingresa: color, VIN, tipo de transmisión, notas.
  4. Marca si el vehículo tiene clave (checkbox `has_key`).
  5. **Si marcó "sí"**, ingresa la clave en el input que aparece.
  6. Asocia el vehículo a un cliente vía `vehicle_ownership` (fecha de inicio = ahora).
  7. Guarda el vehículo.
  8. Sistema valida unicidad de placa en el taller.
  9. Sistema crea la fila en `vehicles` con `has_key` y `key_code` (si aplica).
  10. Sistema crea la fila en `vehicle_ownerships`.
- **Flujos alternativos**:
  - **Placa duplicada en el taller**: sistema muestra error y sugiere buscar el vehículo existente.
  - **Cliente no existe**: se crea inline sin salir del flujo (ver `03-clientes.md` UC-CUST-01).
  - **Vehículo sin clave**: el usuario no marca el checkbox; `has_key = false` y `key_code = NULL`.
- **Reglas de negocio**:
  - **`key_code` solo se llena si `has_key = true`**. Si el vehículo no tiene inmovilizador, queda `NULL`.
  - **`key_code` es del vehículo, no de la orden**. Se registra una vez y persiste entre visitas.
  - **Todos los roles activos del taller pueden ver `key_code`**. No hay restricción por rol (ver [D-DS-17](../../../design/decisions.md)).
  - La placa es única por taller (`UNIQUE (workshop_id, license_plate)` con soft delete).
  - El vehículo pertenece al taller (`workshop_id`).
- **Datos involucrados**: `vehicles`, `vehicle_ownerships`, `customers`.
- **Resultado esperado**: Vehículo creado, asociado a un cliente, con clave (si aplica).

---

## UC-VEH-02: Buscar vehículo por placa o VIN

- **Actor**: Todos
- **Prioridad**: MVP
- **Precondiciones**: Usuario autenticado con cualquier rol activo en el taller.
- **Flujo principal**:
  1. Usuario navega a "Vehículos".
  2. Ingresa placa o VIN en el buscador.
  3. Sistema busca en `vehicles` filtrando por `workshop_id` y `deleted_at IS NULL`.
  4. Sistema muestra resultados coincidentes.
- **Flujos alternativos**:
  - **Sin resultados**: sistema muestra estado vacío con opción "Registrar nuevo vehículo".
- **Reglas de negocio**:
  - La búsqueda es case-insensitive para placa y VIN.
  - Solo se muestran vehículos del taller activo.
- **Datos involucrados**: `vehicles`.
- **Resultado esperado**: Lista de vehículos coincidentes.

---

## UC-VEH-03: Ver detalle de vehículo

- **Actor**: Todos
- **Prioridad**: MVP
- **Precondiciones**: Usuario autenticado, vehículo existente en el taller activo.
- **Flujo principal**:
  1. Usuario navega al detalle del vehículo.
  2. Sistema muestra:
     - Datos del vehículo: placa, marca, modelo, año, color, VIN, transmisión, notas.
     - **Clave del vehículo** 🆕: si `has_key = true`, se muestra el valor con toggle ver/ocultar. Si `has_key = false`, se muestra "Sin clave".
     - Propietario actual (vía `vehicle_ownerships` con `ended_at IS NULL`).
     - Historial de órdenes (link a UC-VEH-05).
  3. Usuario puede tocar el toggle de la clave para revelarla/ocultarla.
- **Flujos alternativos**:
  - **Vehículo sin clave**: se muestra "Sin clave" en lugar del input.
- **Reglas de negocio**:
  - **La clave se muestra con toggle ver/ocultar** (por UX, no por seguridad). El valor por defecto es oculto (`••••`).
  - Todos los roles activos pueden ver la clave (D-DS-17).
- **Datos involucrados**: `vehicles`, `vehicle_ownerships`, `work_orders`.
- **Resultado esperado**: Detalle del vehículo visible, con clave (si aplica) y opción de revelarla.

---

## UC-VEH-04: Editar vehículo

- **Actor**: Advisor
- **Prioridad**: MVP
- **Precondiciones**: Usuario autenticado con rol `advisor` u `owner`, vehículo existente en el taller activo.
- **Flujo principal**:
  1. Advisor navega al detalle del vehículo y toca "Editar".
  2. Sistema muestra formulario pre-llenado.
  3. Advisor modifica los campos deseados: placa, marca, modelo, año, color, VIN, transmisión, notas.
  4. Advisor puede modificar el checkbox `has_key`:
     - Si estaba en `false` y ahora marca `true`: aparece el input de clave.
     - Si estaba en `true` y ahora marca `false`: el input de clave desaparece y `key_code` se limpia.
     - Si estaba en `true` y sigue en `true`: puede modificar el valor de la clave.
  5. Advisor guarda los cambios.
  6. Sistema actualiza `vehicles` y `updated_at`.
- **Flujos alternativos**:
  - **Placa duplicada en el taller**: sistema muestra error.
  - **Cambio de `has_key` de `true` a `false`**: el sistema limpia `key_code` automáticamente.
- **Reglas de negocio**:
  - Si `has_key` cambia a `false`, `key_code` se pone en `NULL`.
  - Si `has_key` cambia a `true`, `key_code` es obligatorio.
  - La placa sigue siendo única por taller.
  - El `workshop_id` no se puede cambiar.
- **Datos involucrados**: `vehicles`.
- **Resultado esperado**: Vehículo actualizado, con clave actualizada (si aplica).

---

## UC-VEH-05: Ver historial completo de órdenes de un vehículo

- **Actor**: Todos
- **Prioridad**: MVP
- **Precondiciones**: Usuario autenticado, vehículo existente en el taller activo.
- **Flujo principal**:
  1. Usuario navega al detalle del vehículo y toca "Historial".
  2. Sistema muestra lista de órdenes de trabajo del vehículo, ordenadas por fecha descendente.
  3. Cada orden muestra: número, fecha, estado, problema reportado, costo total.
  4. Usuario puede tocar una orden para ver su detalle.
- **Flujos alternativos**:
  - **Sin órdenes**: sistema muestra estado vacío.
- **Reglas de negocio**:
  - Solo se muestran órdenes del taller activo.
  - Se muestran todas las órdenes (abiertas, cerradas, canceladas).
- **Datos involucrados**: `work_orders`, `vehicles`.
- **Resultado esperado**: Historial visible.

---

## UC-VEH-06: Registrar transferencia de propiedad

- **Actor**: Advisor
- **Prioridad**: Fase 2
- **Precondiciones**: Vehículo existente con propietario actual.
- **Flujo principal**:
  1. Advisor navega al detalle del vehículo y toca "Transferir propiedad".
  2. Sistema muestra formulario: nuevo propietario (buscar o crear cliente).
  3. Advisor confirma la transferencia con fecha efectiva.
  4. Sistema cierra la `vehicle_ownership` actual (set `ended_at = fecha efectiva`).
  5. Sistema crea nueva `vehicle_ownership` con el nuevo cliente.
- **Reglas de negocio**:
  - Una sola `vehicle_ownership` activa por vehículo.
  - El historial de órdenes previas se conserva.
- **Datos involucrados**: `vehicle_ownerships`, `customers`, `vehicles`.
- **Resultado esperado**: Nueva ownership activa, ownership anterior cerrada.

---

## UC-VEH-07: Eliminar vehículo (soft delete)

- **Actor**: Owner
- **Prioridad**: Fase 2
- **Precondiciones**: Vehículo existente en el taller activo, sin órdenes abiertas.
- **Flujo principal**:
  1. Owner navega al detalle del vehículo y toca "Eliminar".
  2. Sistema muestra modal de confirmación con motivo obligatorio.
  3. Owner confirma.
  4. Sistema actualiza `deleted_at = now()` y `cancellation_reason` (motivo).
  5. Sistema oculta el vehículo de los listados.
- **Flujos alternativos**:
  - **Vehículo con órdenes abiertas**: sistema bloquea la eliminación.
- **Reglas de negocio**:
  - Solo `owner` puede eliminar vehículos.
  - No se puede eliminar un vehículo con órdenes activas.
  - El historial de órdenes se conserva.
- **Datos involucrados**: `vehicles`, `work_orders`.
- **Resultado esperado**: Vehículo con `deleted_at` seteado.

---

## Modelo de datos del feature

Tabla principal: `vehicles`.

Campos relevantes para la clave del vehículo:

| Campo      | Tipo                            | Notas                                          |
| ---------- | ------------------------------- | ---------------------------------------------- |
| `has_key`  | `boolean NOT NULL DEFAULT true` | Indica si el vehículo tiene inmovilizador      |
| `key_code` | `text`                          | 🆕 Nullable. Solo se llena si `has_key = true` |

Tabla relacionada: `vehicle_ownerships`.

Ver [`docs/architecture/data-model/tables/02-customers-vehicles.md`](../../../architecture/data-model/tables/02-customers-vehicles.md) para el detalle completo.

---

## UI / UX

### Formulario de vehículo

- **Mobile-first**: campos full-width apilados.
- **Checkbox `has_key`**: cuando se marca, el input de clave aparece con una transición suave.
- **Input de clave**: `type="password"` con botón de ojo (toggle ver/ocultar). Ver `app-input` con `revealable` en [`design/components.md`](../../../design/components.md).
- **Validación**: placa única por taller, año válido (1900 a año actual + 1).
- **Autoguardado de borrador**: si el usuario cierra el navegador, se preserva el borrador en `localStorage` (D-PWA-06).

### Detalle de vehículo

- **Clave del vehículo**: se muestra en una fila con icono de llave, valor oculto (`••••`) y botón de ojo. Ver `app-key-display` en [`design/components.md`](../../../design/components.md).
- **Propietario actual**: card con nombre y teléfono del cliente.
- **Historial**: link a UC-VEH-05.

### Tarjeta de vehículo (listado)

- Muestra: placa, marca, modelo, año, propietario.
- Si tiene clave: icono de llave con valor oculto y botón de ojo.
- Si no tiene clave: icono de candado abierto con "Sin clave".

---

## Testing

| Caso de uso | Unit | Integration | E2E |
| ----------- | ---- | ----------- | --- |
| UC-VEH-01   | ✅   | ✅          | ⚠️  |
| UC-VEH-02   | ✅   | ✅          | ❌  |
| UC-VEH-03   | ✅   | ✅          | ⚠️  |
| UC-VEH-04   | ✅   | ✅          | ⚠️  |
| UC-VEH-05   | ⚠️   | ✅          | ❌  |
| UC-VEH-06   | ❌   | ❌          | ❌  |
| UC-VEH-07   | ❌   | ❌          | ❌  |

**Leyenda**: ✅ cubierto | ⚠️ parcial | ❌ no cubierto

**Nota**: UC-VEH-06 y UC-VEH-07 son Fase 2, no se testean en MVP.

---

## Referencias

- [Glosario](../../glossary.md): "Vehículo", "Clave del vehículo", "Propiedad de vehículo"
- [Actores y roles](../../actors-and-roles.md): permisos de vehículos
- [Reglas de negocio](../../business-rules.md): RT-15 (vehículo independiente del cliente)
- [Modelo relacional](../../../architecture/data-model/tables/02-customers-vehicles.md)
- [Design system](../../../design/decisions.md): D-DS-17 (clave visible para todos)

---

_Feature Vehículos v1.1 — Documento vivo._
