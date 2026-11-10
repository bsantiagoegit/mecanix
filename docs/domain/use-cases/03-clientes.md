[← Índice de casos de uso](./README.md)

# Feature 3: Clientes

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Noviembre 2026
- **Feature ID:** `03`
- **Prefijo de casos de uso:** `UC-CUST`

---

## Objetivo

Registrar y consultar a las personas que llevan su vehículo al taller. El cliente **no es usuario del sistema** en el MVP: es un registro que el taller mantiene (nombre, celular, cédula…) para saber a quién pertenece cada vehículo y a quién contactar. Un cliente puede tener varios vehículos y un vehículo puede cambiar de dueño ([RT-15](../business-rules.md)), por eso la relación se guarda aparte (`vehicle_ownerships`).

---

## Actores

| Actor    | Rol en este feature                                                                                |
| -------- | -------------------------------------------------------------------------------------------------- |
| Advisor  | Registra, busca, consulta y edita clientes                                                         |
| Owner    | Todo lo que hace el Advisor, más eliminar (soft delete) y fusionar duplicados en fases posteriores |
| Mechanic | Solo busca y consulta clientes, **viendo únicamente el nombre** (sin teléfono, email ni dirección) |

El límite del Mechanic lo impone la base de datos, no solo la interfaz: la tabla `customers` solo la leen `owner` y `advisor`, y el Mechanic consulta la vista `customers_public` ([D-RLS-12](../../architecture/security/decisions.md)).

---

## Dependencias

- **Requiere**: `02-onboarding-taller.md` (un taller activo con sus usuarios).
- **Requerido por**: `04-vehiculos.md` (un vehículo se asocia a un cliente) y `05-ordenes-trabajo.md` (una orden necesita un cliente).

---

## Casos de uso

| ID         | Caso de uso                                 | Actor   | Prioridad |
| ---------- | ------------------------------------------- | ------- | --------- |
| UC-CUST-01 | Registrar cliente                           | Advisor | **MVP**   |
| UC-CUST-02 | Buscar cliente por nombre, celular o cédula | Todos   | **MVP**   |
| UC-CUST-03 | Ver detalle de cliente                      | Todos   | **MVP**   |
| UC-CUST-04 | Editar cliente                              | Advisor | **MVP**   |
| UC-CUST-05 | Ver historial de vehículos de un cliente    | Todos   | **MVP**   |
| UC-CUST-06 | Eliminar cliente (soft delete)              | Owner   | Fase 2    |
| UC-CUST-07 | Fusionar clientes duplicados                | Owner   | Fase 3    |

"Advisor" incluye al `owner`, que puede hacer todo lo que hace un asesor.

---

## Datos del cliente y validaciones

Los mismos datos y reglas valen al registrar (UC-CUST-01) y al editar (UC-CUST-04).

| Campo            | Obligatorio | Regla                                                                                                                      |
| ---------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| `first_name`     | Sí          | Hasta 120 caracteres.                                                                                                      |
| `last_name`      | Sí          | Hasta 120 caracteres.                                                                                                      |
| `phone`          | Sí          | **Celular ecuatoriano**: 10 dígitos y empieza con `09` (`0987654321`). No es único: una familia puede compartir celular.   |
| `email`          | Sí          | Formato válido con dominio (`ana@example` no es válido). Es el mismo validador global del inicio de sesión y el registro.  |
| `identification` | Sí          | **Cédula ecuatoriana** de 10 dígitos, válida según el Módulo 10 (ver abajo). **Única por taller** entre los no eliminados. |
| `address`        | Sí          | Hasta 200 caracteres.                                                                                                      |

**Todos los campos son obligatorios.** Los validadores de celular y de cédula son utilidades globales de la app (`shared/utils`), igual que el del email, y las mismas reglas se aplican al registrar y al editar.

**Celular**: solo dígitos, sin espacios, guiones ni prefijo `+593`; exactamente 10; empieza con `09`. Cada fallo tiene su mensaje ("Escribe solo números", "El celular debe tener 10 dígitos", "El celular debe empezar con 09"). Los teléfonos fijos no se aceptan.

**Cédula (Módulo 10)**: se comprueba, en este orden:

1. Solo dígitos y exactamente 10.
2. Los dos primeros dígitos son el **código de provincia**: de `01` a `24`, o `30` (ecuatorianos registrados en el exterior).
3. El **tercer dígito** es de 0 a 5 (personas naturales; 6 y 9 corresponden a sociedades y entidades públicas).
4. **Dígito verificador**: cada uno de los 9 primeros dígitos se multiplica por `2,1,2,1,2,1,2,1,2`; a los productos mayores que 9 se les resta 9; se suman; el verificador es lo que falta para la siguiente decena (`(10 − suma mod 10) mod 10`) y debe ser igual al décimo dígito. Ejemplo: `1710034065` → productos `2,7,2,0,0,3,8,0,3` (el último, `6 × 2 = 12`, pasa a `3`); suma 25; verificador `(10 − 5) mod 10 = 5`, igual al décimo dígito: válida. El spec del validador tiene más casos.

- Los espacios al inicio y al final se quitan al escribir o pegar, y la base de datos lo vuelve a garantizar al guardar.
- La unicidad de la cédula es por taller entre los clientes no eliminados.
- **Pendiente en la base de datos**: hoy la base de datos solo impone el formato anterior (teléfono de 7 a 20 caracteres, identificación de hasta 20) y admite campos vacíos; las reglas de arriba las aplica la app. Llevarlas a la base de datos (`NOT NULL`, celular de 10 dígitos y cédula con Módulo 10) es un cambio aparte, porque obliga a actualizar el seed y las pruebas.
- **Limitación del MVP**: solo se registran clientes con cédula ecuatoriana. Quien no la tiene (un extranjero con pasaporte, por ejemplo) no se puede registrar por ahora; si el taller lo necesita, se decidirá cómo en una fase posterior.
- El cliente pertenece al taller (`workshop_id`), que no se puede cambiar.

---

## UC-CUST-01: Registrar cliente

- **Actor**: Advisor
- **Prioridad**: MVP
- **Precondiciones**: Usuario autenticado con rol `advisor` u `owner` en el taller activo.
- **Flujo principal**:
  1. Advisor navega a "Clientes" y toca "Nuevo cliente": el formulario se abre en una **ventana modal** sobre la lista, sin cambiar de pantalla (o lo crea **inline** desde el flujo de nuevo vehículo o de nueva orden, sin salir de él).
  2. Ingresa todos los datos, que son obligatorios: nombres, apellidos, celular, email, cédula y dirección.
  3. Cada campo se valida al salir de él (celular de 10 dígitos, email con dominio, cédula válida).
  4. Guarda el cliente.
  5. Sistema valida los datos y la unicidad de la cédula en el taller.
  6. Sistema crea la fila en `customers`.
  7. Sistema cierra el modal, confirma el registro y actualiza la lista (o, si fue inline, devuelve el cliente creado al flujo que lo pidió).
- **Flujos alternativos**:
  - **Celular o cédula inválidos**: el sistema marca el campo con el motivo (p. ej. "La cédula debe tener 10 dígitos" o "Cédula inválida: el dígito verificador no coincide") y no guarda.
  - **Cédula duplicada en el taller**: el sistema **bloquea** el guardado, muestra "Ya existe un cliente con esta cédula" y enlaza al cliente existente (nombre y celular) para que el Advisor lo use en lugar de crear otro.
  - **Celular ya usado por otro cliente**: el sistema **no bloquea**: avisa "Ya hay clientes con este celular" al salir del campo y los lista (nombre). El Advisor decide si es una persona distinta (p. ej. un familiar) y continúa, o abre el existente.
  - **Datos inválidos**: el sistema marca cada campo con su error y no guarda.
  - **Cerrar el modal**: con "Cancelar", la X o la tecla `Esc` se descarta lo escrito; un clic fuera del modal **no** lo cierra, para no perder datos por error. Al volver a abrirlo, el formulario empieza vacío.
  - **Sin conexión o error del servidor**: el sistema avisa que no se pudo guardar, deja el modal abierto y **conserva lo escrito** en el formulario para reintentar (la app es online-first, no hay cola offline en el MVP, [ADR-006](../../architecture/adr/ADR-006-pwa-online-first.md)).
- **Reglas de negocio**:
  - Un cliente nuevo siempre queda en el taller activo del usuario.
  - Se permiten clientes homónimos (mismos nombre y apellido): el nombre no identifica a una persona.
  - Registrar un cliente no exige registrar un vehículo; el vehículo se asocia después (UC-VEH-01).
- **Datos involucrados**: `customers`.
- **Resultado esperado**: Cliente creado en el taller, con todos sus datos válidos y sin duplicar su cédula, y visible en las búsquedas.

---

## UC-CUST-02: Buscar cliente por nombre, celular o cédula

- **Actor**: Todos
- **Prioridad**: MVP
- **Precondiciones**: Usuario autenticado con cualquier rol activo en el taller.
- **Flujo principal**:
  1. Usuario navega a "Clientes". Ve la lista del taller ordenada por apellido y nombre, de 20 en 20.
  2. Escribe en el buscador. La búsqueda se lanza al dejar de escribir (con una pequeña espera, no en cada tecla).
  3. Sistema busca entre los clientes **no eliminados** del taller activo.
  4. Sistema muestra los resultados coincidentes y permite cargar más.
  5. Usuario toca un resultado para ver su detalle (UC-CUST-03).
- **Flujos alternativos**:
  - **Buscador vacío**: se muestra la lista completa paginada.
  - **Sin resultados**: estado vacío con un mensaje ("No se encontraron clientes…"). Para registrar a alguien nuevo se usa el botón "Nuevo cliente" de la parte superior (solo Advisor y Owner).
  - **Mechanic**: el buscador solo cubre el **nombre** y los resultados muestran solo el nombre (no tiene acceso a celular ni cédula).
  - **Error del servidor o sin conexión**: mensaje de error con la opción de reintentar; no se muestra una lista vacía como si no hubiera clientes.
- **Reglas de negocio**:
  - La búsqueda no distingue mayúsculas y encuentra el texto en cualquier parte del campo. No ignora tildes en el MVP ("Perez" no encuentra "Pérez").
  - Si el texto tiene varias palabras, **todas** deben coincidir, cada una en el nombre, el apellido, el celular o la cédula ("ana pér" encuentra a "Ana Pérez").
  - Se busca en `first_name`, `last_name`, `phone` e `identification` (Advisor y Owner) o solo en nombre y apellido (Mechanic).
  - Solo se muestran clientes del taller activo y no eliminados (`deleted_at IS NULL`).
  - Cada resultado muestra nombre completo y, si el rol lo permite, celular.
- **Datos involucrados**: función `search_customers` sobre `customers` (el Mechanic recibe solo el nombre).
  - La búsqueda la hace la función `search_customers`, no filtros armados en la app: el texto viaja como parámetro y la propia función aplica la regla del Mechanic.
- **Resultado esperado**: Lista de clientes coincidentes, paginada.

---

## UC-CUST-03: Ver detalle de cliente

- **Actor**: Todos
- **Prioridad**: MVP
- **Precondiciones**: Usuario autenticado, cliente existente y no eliminado en el taller activo.
- **Flujo principal**:
  1. Usuario abre un cliente desde la búsqueda (UC-CUST-02), desde el detalle de un vehículo o desde una orden.
  2. Sistema muestra:
     - **Datos del cliente**: nombre completo y, para Advisor y Owner, celular, email, cédula y dirección (en un cliente antiguo, los datos que falten se muestran como "—").
     - **Vehículos actuales** del cliente (propiedades sin fecha de fin), con placa, marca, modelo y año; cada uno enlaza a su detalle.
     - Acceso al **historial de vehículos** (UC-CUST-05).
     - Acciones según el rol: "Editar" (Advisor y Owner).
  3. Usuario puede volver a la lista conservando su búsqueda.
- **Flujos alternativos**:
  - **Cliente sin vehículos**: estado vacío "Aún no tiene vehículos" con acción "Registrar vehículo" (Advisor y Owner).
  - **Cliente inexistente, de otro taller o eliminado** (p. ej. un enlace antiguo): el sistema muestra "Cliente no encontrado". No distingue entre "no existe" y "es de otro taller", para no revelar datos de otros talleres.
  - **Mechanic**: ve solo el nombre; las secciones de contacto no aparecen (no se muestran vacías: no existen para su rol).
- **Reglas de negocio**:
  - La visibilidad de los datos de contacto la decide la base de datos según el rol ([D-RLS-12](../../architecture/security/decisions.md)); la interfaz no es la barrera.
  - Solo se muestran vehículos del taller activo.
- **Datos involucrados**: `customers` (o `customers_public`), `vehicle_ownerships`, `vehicles`.
- **Resultado esperado**: Detalle del cliente con sus vehículos actuales y las acciones que su rol permite.

---

## UC-CUST-04: Editar cliente

- **Actor**: Advisor
- **Prioridad**: MVP
- **Precondiciones**: Usuario autenticado con rol `advisor` u `owner`, cliente existente y no eliminado en el taller activo.
- **Flujo principal**:
  1. Advisor abre el detalle del cliente y toca "Editar".
  2. Sistema muestra el formulario con los datos actuales.
  3. Advisor modifica los campos que necesite (mismas reglas que UC-CUST-01).
  4. Advisor guarda los cambios.
  5. Sistema valida y actualiza `customers` y `updated_at`.
  6. Sistema vuelve al detalle con los datos nuevos y un aviso de confirmación.
- **Flujos alternativos**:
  - **Cédula duplicada**: el sistema bloquea el guardado y enlaza al otro cliente, igual que al registrar.
  - **Cliente antiguo sin alguno de los datos** (por ejemplo, registrado antes de que fueran obligatorios): el formulario los pide para poder guardar.
  - **Teléfono ya usado por otro cliente**: aviso no bloqueante, igual que al registrar.
  - **Sin cambios**: guardar no hace ninguna llamada ni cambia `updated_at`.
  - **Cliente eliminado o inexistente mientras se editaba**: el sistema avisa que ya no está disponible y vuelve a la lista.
  - **Dos usuarios editan a la vez**: gana el último en guardar (no hay bloqueo optimista en el MVP).
  - **Sin conexión o error del servidor**: igual que al registrar, se conserva lo escrito.
- **Reglas de negocio**:
  - El `workshop_id` no se puede cambiar.
  - Cambiar los datos del cliente **no** modifica las órdenes ya creadas: las órdenes referencian al cliente por su `id`, así que muestran los datos vigentes.
  - El Mechanic no edita clientes.
- **Datos involucrados**: `customers`.
- **Resultado esperado**: Cliente actualizado.

---

## UC-CUST-05: Ver historial de vehículos de un cliente

- **Actor**: Todos
- **Prioridad**: MVP
- **Precondiciones**: Usuario autenticado, cliente existente y no eliminado en el taller activo.
- **Flujo principal**:
  1. Usuario navega al detalle del cliente y toca "Historial de vehículos".
  2. Sistema lista todos los vehículos que el cliente ha tenido, del más reciente al más antiguo según la fecha de inicio de la propiedad.
  3. Cada vehículo muestra: placa, marca, modelo y año, el periodo (`started_at` a `ended_at`) y una etiqueta "Actual" o "Anterior".
  4. Usuario toca un vehículo para ver su detalle (UC-VEH-03).
- **Flujos alternativos**:
  - **Sin vehículos**: estado vacío "Este cliente no ha tenido vehículos".
  - **Vehículo eliminado**: se sigue mostrando en el historial, marcado como eliminado, sin enlace a su detalle.
- **Reglas de negocio**:
  - Un vehículo tiene una sola propiedad activa a la vez (`vehicle_ownerships.ended_at IS NULL`); las cerradas son historia ([RT-15](../business-rules.md)).
  - Las transferencias de propiedad se registran en UC-VEH-06 (Fase 2); en el MVP el historial solo tendrá, en la práctica, vehículos actuales.
  - El historial de **órdenes** de cada vehículo se consulta en UC-VEH-05; este caso de uso solo cubre qué vehículos tuvo el cliente.
- **Datos involucrados**: `vehicle_ownerships`, `vehicles`.
- **Resultado esperado**: Lista de los vehículos del cliente, actuales y anteriores.

---

## UC-CUST-06: Eliminar cliente (soft delete)

- **Actor**: Owner
- **Prioridad**: Fase 2
- **Precondiciones**: Usuario autenticado con rol `owner`, cliente existente en el taller activo **sin órdenes abiertas**.
- **Flujo principal**:
  1. Owner abre el detalle del cliente y toca "Eliminar".
  2. Sistema muestra una confirmación que explica el efecto ("El cliente dejará de aparecer en las búsquedas; su historial se conserva").
  3. Owner confirma.
  4. Sistema actualiza `deleted_at = now()`.
  5. Sistema oculta al cliente de los listados y búsquedas.
- **Flujos alternativos**:
  - **Cliente con órdenes abiertas**: el sistema bloquea la eliminación e indica cuántas órdenes están abiertas.
  - **Cliente con vehículos actuales**: el sistema permite eliminar (los vehículos siguen existiendo, [RT-15](../business-rules.md)) y avisa de que quedarán sin propietario visible.
- **Reglas de negocio**:
  - Solo `owner` elimina clientes. La base de datos lo impide a otros roles (trigger sobre `deleted_at`), igual que la matriz de [roles](../actors-and-roles.md).
  - **Orden abierta** = en cualquier estado salvo `delivered` y `cancelled` (los terminales, ver [state-machine](../state-machine.md)); un borrador (`draft`) cuenta como abierta.
  - El historial de órdenes se conserva: las órdenes siguen apuntando al cliente.
  - Al eliminar, su cédula queda libre para registrar a otro cliente.
  - No hay restauración desde la app en esta fase.
- **Datos involucrados**: `customers`, `work_orders`.
- **Resultado esperado**: Cliente con `deleted_at` seteado, fuera de los listados.

---

## UC-CUST-07: Fusionar clientes duplicados

- **Actor**: Owner
- **Prioridad**: Fase 3
- **Precondiciones**: Dos clientes del taller que corresponden a la misma persona.
- **Flujo principal** (a detallar al diseñarlo):
  1. Owner elige dos clientes y cuál se conserva.
  2. Sistema muestra qué datos y qué vehículos, propiedades y órdenes pasarán al cliente conservado.
  3. Owner confirma.
  4. Sistema reasigna las propiedades y las órdenes al cliente conservado y elimina (soft delete) al otro.
- **Reglas de negocio**:
  - La fusión no pierde historial: ninguna orden ni propiedad queda sin cliente.
  - Debe ser una sola operación atómica en el servidor (función), no varios cambios desde la app.
- **Datos involucrados**: `customers`, `vehicle_ownerships`, `work_orders`.
- **Resultado esperado**: Un único cliente con todo el historial.

---

## Permisos por rol

Resumen; la matriz completa está en [actors-and-roles](../actors-and-roles.md).

| Acción                         | Owner | Advisor | Mechanic       |
| ------------------------------ | ----- | ------- | -------------- |
| Registrar cliente (UC-CUST-01) | ✅    | ✅      | ❌             |
| Buscar y ver (02, 03, 05)      | ✅    | ✅      | ⚠️ solo nombre |
| Editar (UC-CUST-04)            | ✅    | ✅      | ❌             |
| Eliminar (UC-CUST-06, Fase 2)  | ✅    | ❌      | ❌             |

---

## Referencias

- Glosario: Cliente, Vehículo, Propiedad de vehículo (`vehicle_ownership`).
- Reglas: [RT-15](../business-rules.md) (vehículo independiente del cliente).
- Estados: [state-machine](../state-machine.md) (estados terminales de una orden).
- Datos y seguridad: [tablas de clientes y vehículos](../../architecture/data-model/tables/02-customers-vehicles.md), [policies](../../architecture/security/policies/02-customers-vehicles.md) y [vistas](../../architecture/security/views.md).

---

_Feature 3: Clientes v1.0 — Documento vivo._
