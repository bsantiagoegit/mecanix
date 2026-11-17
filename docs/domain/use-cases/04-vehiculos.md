[← Índice de casos de uso](./README.md)

# Feature 4: Vehículos

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.2
- **Fecha:** Noviembre 2026
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
| Mechanic | Solo busca y ve vehículos (no crea ni edita), incluida su clave     |

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

## Datos del vehículo y validaciones

Los mismos datos y reglas valen al registrar (UC-VEH-01) y al editar (UC-VEH-04). Las reglas de formato son **utilidades globales** de la app (`shared/utils`), como las de clientes, y la base de datos las vuelve a imponer.

| Campo           | Obligatorio               | Regla                                                                                                                             |
| --------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `license_plate` | Sí                        | **Placa ecuatoriana** (ver abajo). **Única por taller** entre los no eliminados.                                                  |
| `make`          | Sí                        | Marca. Hasta 60 caracteres.                                                                                                       |
| `model`         | Sí                        | Modelo. Hasta 60 caracteres.                                                                                                      |
| `year`          | Sí                        | Entero de 1900 al año actual + 1.                                                                                                 |
| `color`         | No                        | Hasta 30 caracteres.                                                                                                              |
| `vin`           | No                        | 17 caracteres, letras y números, **sin** `I`, `O` ni `Q` (norma ISO 3779). Se guarda en mayúsculas.                               |
| `transmission`  | No                        | Una de: Manual, Automática, CVT, Otra.                                                                                            |
| `has_key`       | Sí (por defecto, marcado) | Si el vehículo tiene clave (inmovilizador).                                                                                       |
| `key_code`      | Solo si `has_key = true`  | Hasta 50 caracteres. **Obligatoria con `has_key = true`; `NULL` con `has_key = false`** (la base de datos lo exige).              |
| `notes`         | No                        | Hasta 500 caracteres.                                                                                                             |
| Cliente dueño   | Sí, solo al registrar     | Un cliente existente del taller (ver UC-VEH-01). Cambiarlo después es una transferencia (UC-VEH-06, Fase 2): editar no lo cambia. |

**Placa**: se escribe en mayúsculas y con guion, y la app corrige lo que puede (`pba1234` → `PBA-1234`). Se aceptan:

- **Autos**: 3 letras y 4 dígitos (`PBA-1234`), o 3 letras y 3 dígitos (formato antiguo, `PBA-123`).
- **Motos**: 2 letras, 3 dígitos y 1 letra (`AB-123C`).

Cada fallo tiene su mensaje ("La placa debe tener 3 letras y 3 o 4 números, como PBA-1234", etc.). La unicidad es por taller entre los vehículos no eliminados, sin distinguir mayúsculas.

**VIN**: solo se valida el formato (largo y caracteres). El dígito verificador de la posición 9 no se comprueba: es propio de los vehículos norteamericanos y no aplica a todos los que llegan a un taller.

- Los espacios al inicio y al final se quitan, y la base de datos lo garantiza al guardar.
- **Limitación del MVP**: solo se registran placas ecuatorianas. Un vehículo con placa extranjera o temporal no se puede registrar por ahora.
- El vehículo pertenece al taller (`workshop_id`), que no se puede cambiar.

---

## UC-VEH-01: Registrar vehículo

- **Actor**: Advisor
- **Prioridad**: MVP
- **Precondiciones**:
  - Usuario autenticado con rol `advisor` u `owner` en el taller activo.
  - Existe al menos un cliente registrado (o se crea inline).
- **Flujo principal**:
  1. Advisor navega a "Vehículos" y toca "Nuevo vehículo": el formulario se abre en una **ventana modal** sobre la lista, sin cambiar de pantalla (o toca "Registrar vehículo" en el detalle de un cliente, y el modal se abre con ese cliente ya elegido).
  2. Ingresa datos obligatorios: placa, marca, modelo, año.
  3. Opcionalmente ingresa: color, VIN, tipo de transmisión, notas.
  4. **Elige al cliente dueño** buscándolo entre los clientes del taller (por nombre, celular o cédula). Si todavía no está registrado, un enlace lo lleva a "Clientes" para registrarlo y volver.
  5. El checkbox `has_key` ("Tiene clave") viene marcado; si el vehículo no tiene, lo desmarca.
  6. **Con clave**, ingresa la clave en el input que aparece (oculta, con botón de ojo).
  7. Guarda el vehículo.
  8. Sistema valida los datos y la unicidad de placa en el taller.
  9. Sistema crea, **en una sola operación**, la fila en `vehicles` (con `has_key` y `key_code`) y la fila en `vehicle_ownerships` (`started_at` = ahora): o se crean las dos o ninguna.
  10. Sistema cierra el modal, confirma el registro y actualiza la lista.
- **Flujos alternativos**:
  - **Placa duplicada en el taller**: sistema bloquea el guardado, nombra el vehículo que ya la tiene y enlaza a su detalle.
  - **Cliente no existe**: el formulario no crea clientes (los features no comparten componentes): el enlace "Registrar un cliente" lleva a "Clientes" (UC-CUST-01). Desde el detalle del cliente recién creado, "Registrar vehículo" abre este mismo modal con él ya elegido.
  - **Vehículo sin clave**: el usuario desmarca el checkbox; `has_key = false` y `key_code = NULL`.
  - **Cerrar el modal**: "Cancelar", la X o `Esc`, sin guardar; un clic fuera no lo cierra.
  - **Sin conexión o error del servidor**: el modal queda abierto y conserva lo escrito.
  - **Cliente eliminado mientras se registraba**: el guardado falla con un mensaje claro y no se crea nada.
- **Reglas de negocio**:
  - **`key_code` solo se llena si `has_key = true`**. Si el vehículo no tiene inmovilizador, queda `NULL`.
  - **`key_code` es del vehículo, no de la orden**. Se registra una vez y persiste entre visitas.
  - **Todos los roles activos del taller pueden ver `key_code`**. No hay restricción por rol (ver [D-DS-17](../../../design/decisions.md)).
  - La placa es única por taller (`UNIQUE (workshop_id, license_plate)` con soft delete) y se normaliza (mayúsculas, con guion) antes de guardar.
  - Solo `advisor` y `owner` registran; el Mechanic no ve el botón y la base de datos lo rechaza.
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
  2. Ingresa placa o VIN en el buscador (la lista, sin texto, muestra todos los vehículos del taller).
  3. Sistema busca en `vehicles` filtrando por `workshop_id` y `deleted_at IS NULL`, con la función `search_vehicles`.
  4. Sistema muestra los resultados coincidentes, de 20 en 20 ("Cargar más"): placa, marca, modelo, año, propietario actual y la clave oculta.
  5. Usuario toca un resultado para ver su detalle (UC-VEH-03).
- **Flujos alternativos**:
  - **Sin resultados**: sistema muestra estado vacío; Advisor y Owner ven además la opción "Registrar nuevo vehículo".
  - **Error al buscar**: se muestra el error con "Reintentar", nunca como "no hay vehículos".
- **Reglas de negocio**:
  - La búsqueda es case-insensitive para placa y VIN, e **ignora guiones y espacios** (`pba1234` encuentra `PBA-1234`). Basta una parte del texto.
  - Solo se muestran vehículos del taller activo.
  - Se busca por placa o VIN, no por el nombre del propietario (para eso está la búsqueda de clientes, que lleva a sus vehículos).
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
     - Propietario actual (vía `vehicle_ownerships` con `ended_at IS NULL`): nombre con enlace a su detalle de cliente; el celular lo ven solo Advisor y Owner (el Mechanic ve solo el nombre).
     - Historial de órdenes (UC-VEH-05).
     - Acciones según el rol: "Editar" (Advisor y Owner).
  3. Usuario puede tocar el toggle de la clave para revelarla/ocultarla.
  4. Usuario puede volver a la lista conservando su búsqueda.
- **Flujos alternativos**:
  - **Vehículo sin clave**: se muestra "Sin clave" en lugar del input.
  - **Vehículo sin propietario actual**: se muestra "Sin propietario actual".
  - **Vehículo inexistente, de otro taller o eliminado**: "Vehículo no encontrado"; no distingue entre "no existe" y "es de otro taller".
  - **Error al cargar**: se muestra el error con "Reintentar".
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
  1. Advisor navega al detalle del vehículo y toca "Editar" (o "Editar" en su fila de la lista): se abre el **mismo modal** que para registrar, con el título "Editar vehículo".
  2. Sistema carga el vehículo (muestra un esqueleto un momento) y llena el formulario con sus datos.
  3. Advisor modifica los campos deseados: placa, marca, modelo, año, color, VIN, transmisión, notas.
  4. Advisor puede modificar el checkbox `has_key`:
     - Si estaba en `false` y ahora marca `true`: aparece el input de clave.
     - Si estaba en `true` y ahora marca `false`: el input de clave desaparece y `key_code` se limpia.
     - Si estaba en `true` y sigue en `true`: puede modificar el valor de la clave.
  5. Advisor guarda los cambios.
  6. Sistema actualiza `vehicles` y `updated_at`, cierra el modal, confirma el cambio y actualiza lo que se mostraba.
- **Flujos alternativos**:
  - **Placa duplicada en el taller**: sistema bloquea el guardado y nombra al vehículo que ya la tiene.
  - **Sin cambios**: guardar no llama al servidor; avisa "No hay cambios que guardar".
  - **Vehículo eliminado o inexistente** (al abrir o mientras se editaba): el modal muestra "Vehículo no encontrado".
  - **No se pudo cargar el vehículo**: el modal muestra el error con "Reintentar".
  - **Cambio de `has_key` de `true` a `false`**: el sistema limpia `key_code` automáticamente.
- **Reglas de negocio**:
  - Si `has_key` cambia a `false`, `key_code` se pone en `NULL`.
  - Si `has_key` cambia a `true`, `key_code` es obligatorio.
  - La placa sigue siendo única por taller.
  - El `workshop_id` no se puede cambiar, y tampoco el propietario (transferir es UC-VEH-06).
  - El Mechanic no edita vehículos.
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
  3. Cada orden muestra: número, fecha, estado y problema reportado. El **costo total** se añade cuando existan las cotizaciones y reparaciones que lo calculan (la orden no guarda un total propio).
  4. Usuario puede tocar una orden para ver su detalle (llega con el feature de órdenes; mientras tanto solo se listan).
- **Flujos alternativos**:
  - **Sin órdenes**: sistema muestra estado vacío ("Este vehículo aún no tiene órdenes").
  - **Error al cargar las órdenes**: se muestra solo ese bloque con "Reintentar"; el resto del detalle sigue visible.
- **Reglas de negocio**:
  - Solo se muestran órdenes del taller activo.
  - Un Mechanic ve las órdenes abiertas y solo las cerradas propias, igual que en la lista de órdenes ([actores y roles](../actors-and-roles.md)).
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
  4. Sistema actualiza `deleted_at = now()`. El motivo se registrará cuando se implemente este caso de uso: hoy `vehicles` no tiene una columna para guardarlo (ni existe `cancellation_reason`), y añadirla es una migración de esa fase.
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
- **Es un modal**, el mismo para registrar y editar, con scroll interno en pantallas chicas.
- **Selector de transmisión**: `app-select` (Manual, Automática, CVT, Otra); la clave y el `has_key` usan `app-checkbox` y `app-input` con `revealable`.
- **Placa**: se muestra en mayúsculas mientras se escribe.
- **Autoguardado de borrador**: pendiente. Si el usuario cierra el navegador, se preservaría el borrador en `localStorage` (D-PWA-06); lo mismo vale para los demás formularios largos y no está hecho en ninguno todavía.

### Detalle de vehículo

- **Clave del vehículo**: se muestra en una fila con icono de llave, valor oculto (`••••`) y botón de ojo. Ver `app-key-display` en [`design/components.md`](../../../design/components.md).
- **Propietario actual**: card con nombre (enlace al cliente) y celular, que solo ven Advisor y Owner.
- **Historial**: la lista de órdenes de UC-VEH-05, debajo de los datos.

### Tarjeta de vehículo (listado)

- Muestra: placa, marca, modelo, año, propietario.
- Si tiene clave: icono de llave con valor oculto y botón de ojo.
- Si no tiene clave: icono de candado abierto con "Sin clave".
- El nombre del propietario se muestra a todos los roles (el Mechanic lo lee de `customers_public`).

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
