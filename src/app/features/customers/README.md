# Feature `customers`

Los clientes del taller: las personas que llevan su vehículo. Un cliente **no es usuario del sistema** en el MVP, es un registro que el taller mantiene. Están la **lista con búsqueda**, el **registro y la edición**, el **detalle** del cliente y su **historial de vehículos**.

## Casos de uso

Definidos en [`docs/domain/use-cases/03-clientes.md`](../../../../docs/domain/use-cases/03-clientes.md).

| ID         | Caso de uso                                          | Prioridad | Estado                                                 |
| ---------- | ---------------------------------------------------- | --------- | ------------------------------------------------------ |
| UC-CUST-01 | Registrar cliente                                    | MVP       | **Implementado** (modal de `customer-list-page`)       |
| UC-CUST-02 | Buscar cliente por nombre, teléfono o identificación | MVP       | **Implementado** (`customer-list-page`)                |
| UC-CUST-03 | Ver detalle de cliente                               | MVP       | **Implementado** (`customer-detail-page`)              |
| UC-CUST-04 | Editar cliente                                       | MVP       | **Implementado** (mismo modal de `customer-list-page`) |
| UC-CUST-05 | Ver historial de vehículos de un cliente             | MVP       | **Implementado** (`customer-detail-page`)              |
| UC-CUST-06 | Eliminar cliente (soft delete)                       | Fase 2    | No iniciado (la base de datos ya limita al `owner`)    |
| UC-CUST-07 | Fusionar clientes duplicados                         | Fase 3    | No iniciado                                            |

## Estructura

```
features/customers/
├── components/
│   ├── customer-card/        ← una fila de la lista: nombre y datos de contacto si el rol los ve
│   ├── customer-dialog/      ← el modal de registrar y editar (presentacional)
│   ├── customer-form/        ← formulario de cliente (registrar y editar), presentacional
│   └── customer-vehicle-list/ ← vehículos de un cliente, con su periodo en el historial
├── pages/
│   ├── customer-list-page/   ← lista, búsqueda, paginación; abre el modal de registrar y editar
│   └── customer-detail-page/ ← detalle: datos, vehículos actuales, historial y editar
├── services/
│   ├── customers.service.ts  ← acceso a datos: búsqueda, lectura, alta, edición, vehículos y comprobaciones
│   ├── customer-dialog.state.ts ← estado del modal (abrir, cargar, guardar), lo comparten lista y detalle
│   └── customer-form.state.ts ← estado local de un formulario en uso (guardado, aviso de teléfono, choque)
├── models/
│   ├── customer.model.ts     ← CustomerSummary, Customer, CustomerInput, CustomerVehicle y su normalización
│   └── duplicate-identification.error.ts
├── customers.routes.ts
└── README.md
```

## Rutas

| Ruta             | Página               | Protección                                                                           |
| ---------------- | -------------------- | ------------------------------------------------------------------------------------ |
| `/customers`     | `CustomerListPage`   | `workshopGuard` del shell: cualquier rol con taller, también el mecánico             |
| `/customers/:id` | `CustomerDetailPage` | Igual. Un id inexistente, de otro taller o eliminado muestra "Cliente no encontrado" |

El enlace "Clientes" del encabezado lo ven los tres roles; el botón "Nuevo cliente" y el "Editar" de cada fila, solo `owner` y `advisor`. **Registrar y editar no tienen ruta**: son un modal, el mismo en la lista y en el detalle. La autoridad real es la base de datos (RLS y triggers), no el guard.

## Búsqueda y paginación

`CustomersService.search(workshopId, texto, offset)` llama a la función `search_customers` ([detalle](../../../../docs/architecture/data-model/tables/02-customers-vehicles.md)). La función, no la app, decide qué se busca y qué se devuelve: cada palabra debe coincidir en nombre, apellido, teléfono o identificación, y para el **mecánico** solo en el nombre, con el contacto en `null`. El texto viaja como parámetro; no se arman filtros `ilike` en el cliente.

- **Paginación**: 20 por página. El servicio pide una fila de más para saber si hay otra página (`hasMore`) sin hacer un conteo; "Cargar más" pide desde el `offset` de lo ya cargado y agrega.
- **Espera al escribir**: `SearchBox` (componente compartido) emite el texto (sin espacios sobrantes) 300 ms después de la última tecla y solo si cambió.
- **Respuestas desordenadas**: cada búsqueda lleva un número de petición; si llega la respuesta de una búsqueda que ya quedó atrás (o de un "cargar más" anterior), se descarta.
- **Fallos**: un error al cargar se muestra como error con "Reintentar", nunca como "no hay clientes". Si falla "cargar más" se conserva lo ya cargado y se ofrece reintentar.
- **Estados**: cargando (esqueleto de filas), vacío del taller ("Aún no hay clientes"), vacío de la búsqueda ("No se encontraron clientes para «…»"), error y lista.

El estado es local a la página (signals): no hay slice de NgRx porque no es estado global.

## Registrar y editar (UC-CUST-01 y 04)

Registrar y editar usan **el mismo modal** (`app-modal`, ver [componentes](../../../../docs/design/components.md)) y el mismo formulario, en `CustomerListPage`. Solo existen para `owner` y `advisor`:

- **Registrar**: el botón "Nuevo cliente" de arriba lo abre con un formulario limpio ("Registrar cliente").
- **Editar**: el botón "Editar" de cada fila lo abre titulado "Editar cliente". La lista no trae la dirección, así que primero se carga el cliente completo (`getById`) y el modal muestra un esqueleto del formulario ("Cargando cliente" para lectores de pantalla); si no existe más o no se puede cargar, muestra "Cliente no encontrado" o el error con "Reintentar". Se descarta la respuesta si el modal se cerró o se abrió otro cliente mientras cargaba. Cuando exista el detalle del cliente, también podrá abrir este modal.
- **Al guardar con éxito** el modal se cierra, se avisa con un toast ("Cliente registrado" o "Cambios guardados") y se actualiza la lista. Si falla, se queda abierto con lo escrito. Editando, si no hay cambios (comparando ya normalizado) no se llama al servidor y se avisa. Se cierra con "Cancelar", la X o `Esc` (se descarta lo escrito); un clic fuera **no** lo cierra.

`CustomerForm` es presentacional y lo usan los dos. **Todos los campos son obligatorios** y se validan con utilidades globales de `@shared/utils`, las mismas que usan otros formularios de la app:

| Campo              | Validador                                                | Regla                                                                                     |
| ------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Nombres, apellidos | `Validators.required` + `maxLength(120)`                 | Obligatorios, hasta 120 caracteres                                                        |
| Celular            | `ecuadorMobileValidator` (`ecuador-phone.validator.ts`)  | Solo dígitos, 10 en total, empieza con `09`                                               |
| Email              | `emailValidator` (`email.validator.ts`)                  | El **mismo** que el inicio de sesión, el registro, recuperar contraseña e invitar usuario |
| Cédula             | `ecuadorCedulaValidator` (`ecuador-cedula.validator.ts`) | 10 dígitos y Módulo 10: provincia 01–24 o 30, tercer dígito 0–5, dígito verificador       |
| Dirección          | `Validators.required` + `maxLength(200)`                 | Obligatoria, hasta 200 caracteres                                                         |

Cada validador de Ecuador expone una función pura (`checkEcuadorMobile`, `checkEcuadorCedula`) que devuelve el **motivo** del fallo (formato, largo, prefijo, provincia, tercer dígito o dígito verificador), y el formulario lo traduce a un mensaje específico. El campo de celular y el de cédula limitan lo que se puede escribir a 10 caracteres y piden teclado numérico en el móvil (`maxChars` e `inputmode` del `Input` compartido). El formulario recorta los espacios y emite `CustomerInput`. Lo que no es de presentación (guardar, comprobar el celular) lo guarda `CustomerFormState`, un estado local provisto en la página (no global).

- **Cédula repetida (bloquea)**: la base de datos es la que decide (índice único por taller). Al chocar, `CustomersService` busca al cliente que ya la tiene y lanza `DuplicateIdentificationError`; el formulario lo nombra ("pertenece a Carlos Cliente, teléfono …") y deja de mostrarlo en cuanto el usuario cambia la identificación.
- **Celular repetido (avisa, no bloquea)**: al **salir del campo** con un celular válido se consulta si otros clientes del taller lo usan (`findByPhone`, sin contar al cliente que se edita) y se lista su nombre. El aviso solo vale mientras el campo conserve ese teléfono, se descarta la respuesta de una comprobación que ya quedó atrás (también al reabrir el modal), y un fallo de la consulta no molesta (el aviso es opcional).
- **Si falla el guardado** (red, servidor): el modal se queda abierto y el formulario **conserva lo escrito** para reintentar. Si el cliente se eliminó mientras se editaba, el modal pasa a "Cliente no encontrado".
- **Datos de otro taller**: un cliente de otro taller o eliminado no se distingue de uno inexistente ("Cliente no encontrado").

## Detalle e historial de vehículos (UC-CUST-03 y 05)

`/customers/:id` (`CustomerDetailPage`). Las filas de la lista enlazan a él, y llevan la búsqueda en la URL (`?q=`) para que "← Volver a clientes" deje la lista como estaba; la lista también guarda en `?q=` lo que se busca (sin añadir entradas al historial del navegador), así que el botón Atrás del navegador funciona igual.

- **Datos por rol**: `owner` y `advisor` leen el cliente completo (`getById`): celular, correo, cédula y dirección, con "—" para lo que falte (clientes antiguos). El `mechanic` ve solo el nombre: lo lee de `customers_public` (`getNameById`), porque la base de datos no le deja leer `customers`, y la sección de contacto ni existe para él.
- **Vehículos**: `listVehicles` trae las propiedades del cliente (`vehicle_ownerships`) con su vehículo embebido, de la más reciente a la más antigua. Los **actuales** son los que no tienen fecha de fin. "Historial de vehículos" despliega todos, con "Desde … hasta …", la etiqueta "Actual" o "Anterior" y "Eliminado" si el vehículo se eliminó (siguen apareciendo, sin enlace). El cliente y sus vehículos se cargan en paralelo: el nombre aparece sin esperar a los vehículos, y si fallan solo ellos muestran el error con "Reintentar".
- **Editar**: el botón "Editar" abre el mismo modal que la lista (`CustomerDialogState` + `CustomerDialog`) y, al guardar, el detalle se actualiza.
- **Cédula repetida**: en el modal, el aviso lleva un enlace "Ver cliente" al que ya la tiene; al seguirlo el modal se cierra.
- **Un vehículo no enlaza todavía a su detalle**: la feature de vehículos aún no existe. Tampoco hay "Registrar vehículo" en el estado vacío ("Aún no tiene vehículos"): llegan con ella.
- Cambiar de cliente (por el enlace "Ver cliente") recarga los datos y descarta las respuestas del anterior.

## Pendiente

- Los vehículos del detalle enlazarán a su ficha y el estado vacío ofrecerá "Registrar vehículo" cuando exista la feature de vehículos.
- **La base de datos aún acepta lo anterior**: solo la app exige todos los campos, el celular de 10 dígitos y la cédula con Módulo 10; la base de datos admite campos vacíos, teléfonos de 7 a 20 caracteres e identificaciones de hasta 20. Llevar estas reglas a la base de datos (`NOT NULL`, restricciones de celular y cédula) es un cambio aparte, porque obliga a actualizar el seed y las pruebas.
- Solo se registran clientes con cédula ecuatoriana; un extranjero con pasaporte no se puede registrar por ahora.
- La búsqueda no ignora las tildes (`Perez` no encuentra `Pérez`); es una decisión del MVP, ver el caso de uso.

## Dependencias

- `@core/auth` (`AuthFacade`, para el rol) y `@core/workshops` (`WorkshopFacade`, para el taller activo).
- `@core/supabase` (`SupabaseService`) y `@core/errors` desde el servicio.
- `@shared/components`: `Button`, `Card`, `Input`.
- No importa de otras features.

## Tests

- `customers.service.spec.ts`: parámetros de la función, página extra para `hasMore`, mapeo de filas, contacto `null` y error mapeado.
- `customer-card.spec.ts`: nombre y contacto según lo que llega.
- `customer-list-page.spec.ts`: carga, enlaces al detalle y la búsqueda en la URL, búsqueda, respuestas desordenadas, paginación, errores con reintento, comportamiento por rol y el modal de registrar y editar (abrir, cargar el cliente, guardar, sin cambios, errores, cliente no encontrado, cancelar, formulario limpio).
- `customer-detail-page.spec.ts`: carga por rol (completo o solo nombre), "—" en datos faltantes, no encontrado y error con reintento, cambio de cliente y respuestas desordenadas, volver con la búsqueda, vehículos (actuales, vacío, error) y el historial.
- `customer-vehicle-list.spec.ts` y `customer-dialog.spec.ts`: lo que muestran y avisan.
- `customer-form.spec.ts`: todos los campos obligatorios, celular, cédula y email con su mensaje, largos, datos emitidos, valores iniciales, aviso de celular y choque de cédula.
- `shared/utils/ecuador-phone.validator.spec.ts` y `ecuador-cedula.validator.spec.ts`: cada regla y cada motivo de fallo, con cédulas válidas e inválidas calculadas con el algoritmo.
- `customer-form.state.spec.ts`: guardado y sus resultados, aviso de teléfono con sus carreras y `reset`.
- `customer.model.spec.ts` y `customers.routes.spec.ts`: normalización de los datos y que la feature solo tiene la ruta de la lista.
- `shared/components/modal/modal.spec.ts`: abrir y cerrar, `Esc`, fondo, foco y tamaños.
- La lógica de búsqueda y de roles de la base de datos se prueba en `supabase/tests/rpcs/search-customers.spec.ts`.
