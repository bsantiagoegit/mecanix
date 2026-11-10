# Feature `customers`

Los clientes del taller: las personas que llevan su vehículo. Un cliente **no es usuario del sistema** en el MVP, es un registro que el taller mantiene. Por ahora están la **lista con búsqueda** y el **registro y la edición**; el detalle y el historial de vehículos llegan en la siguiente rama.

## Casos de uso

Definidos en [`docs/domain/use-cases/03-clientes.md`](../../../../docs/domain/use-cases/03-clientes.md).

| ID         | Caso de uso                                          | Prioridad | Estado                                              |
| ---------- | ---------------------------------------------------- | --------- | --------------------------------------------------- |
| UC-CUST-01 | Registrar cliente                                    | MVP       | **Implementado** (`customer-form-page`)             |
| UC-CUST-02 | Buscar cliente por nombre, teléfono o identificación | MVP       | **Implementado** (`customer-list-page`)             |
| UC-CUST-03 | Ver detalle de cliente                               | MVP       | Pendiente                                           |
| UC-CUST-04 | Editar cliente                                       | MVP       | **Implementado** (`customer-form-page`)             |
| UC-CUST-05 | Ver historial de vehículos de un cliente             | MVP       | Pendiente                                           |
| UC-CUST-06 | Eliminar cliente (soft delete)                       | Fase 2    | No iniciado (la base de datos ya limita al `owner`) |
| UC-CUST-07 | Fusionar clientes duplicados                         | Fase 3    | No iniciado                                         |

## Estructura

```
features/customers/
├── components/
│   ├── customer-card/        ← una fila de la lista: nombre y datos de contacto si el rol los ve
│   ├── customer-form/        ← formulario de cliente (registrar y editar), presentacional
│   └── customer-search/      ← campo de búsqueda con espera (300 ms) y sin repetir el mismo texto
├── pages/
│   ├── customer-form-page/   ← registrar (/customers/new) y editar (/customers/:id/edit)
│   └── customer-list-page/   ← lista, búsqueda y paginación
├── services/
│   └── customers.service.ts  ← acceso a datos: búsqueda, lectura, alta, edición y comprobaciones
├── models/
│   ├── customer.model.ts     ← CustomerSummary, Customer, CustomerInput y su normalización
│   ├── customer-prefill.ts   ← qué sugerir en el alta a partir de lo que se buscó sin resultados
│   └── duplicate-identification.error.ts
├── customers.routes.ts
└── README.md
```

## Rutas

| Ruta                  | Página             | Protección                                                               |
| --------------------- | ------------------ | ------------------------------------------------------------------------ |
| `/customers`          | `CustomerListPage` | `workshopGuard` del shell: cualquier rol con taller, también el mecánico |
| `/customers/new`      | `CustomerFormPage` | `roleGuard('owner', 'advisor')`: el mecánico vuelve a `/dashboard`       |
| `/customers/:id/edit` | `CustomerFormPage` | `roleGuard('owner', 'advisor')`                                          |

El enlace "Clientes" del encabezado lo ven los tres roles; el botón "Nuevo cliente" de la lista, solo `owner` y `advisor`. La ruta `new` va antes de `:id/edit` para no confundirse con un id. La autoridad real es la base de datos (RLS y triggers), no el guard.

## Búsqueda y paginación

`CustomersService.search(workshopId, texto, offset)` llama a la función `search_customers` ([detalle](../../../../docs/architecture/data-model/tables/02-customers-vehicles.md)). La función, no la app, decide qué se busca y qué se devuelve: cada palabra debe coincidir en nombre, apellido, teléfono o identificación, y para el **mecánico** solo en el nombre, con el contacto en `null`. El texto viaja como parámetro; no se arman filtros `ilike` en el cliente.

- **Paginación**: 20 por página. El servicio pide una fila de más para saber si hay otra página (`hasMore`) sin hacer un conteo; "Cargar más" pide desde el `offset` de lo ya cargado y agrega.
- **Espera al escribir**: `CustomerSearch` emite el texto (sin espacios sobrantes) 300 ms después de la última tecla y solo si cambió.
- **Respuestas desordenadas**: cada búsqueda lleva un número de petición; si llega la respuesta de una búsqueda que ya quedó atrás (o de un "cargar más" anterior), se descarta.
- **Fallos**: un error al cargar se muestra como error con "Reintentar", nunca como "no hay clientes". Si falla "cargar más" se conserva lo ya cargado y se ofrece reintentar.
- **Estados**: cargando, vacío del taller ("Aún no hay clientes"), vacío de la búsqueda ("No se encontraron clientes para «…»"), error y lista.

El estado es local a la página (signals): no hay slice de NgRx porque no es estado global.

## Registrar y editar (UC-CUST-01 y 04)

`CustomerFormPage` sirve para las dos cosas: con `:id` carga el cliente (`getById`) y edita; sin él registra. Los parámetros de la URL llegan como `input()` (`withComponentInputBinding`). `CustomerForm` es presentacional: valida con las mismas reglas que la base de datos (nombres y apellidos de 1 a 120, teléfono de 7 a 20 con `+ ( ) -`, email con dominio, identificación hasta 20, dirección hasta 200), recorta los espacios y emite `CustomerInput`.

- **Identificación repetida (bloquea)**: la base de datos es la que decide (índice único por taller, sin distinguir mayúsculas porque un trigger la guarda en mayúsculas). Al chocar, `CustomersService` busca al cliente que ya la tiene y lanza `DuplicateIdentificationError`; el formulario lo nombra ("pertenece a Carlos Cliente, teléfono …") y deja de mostrarlo en cuanto el usuario cambia la identificación.
- **Teléfono repetido (avisa, no bloquea)**: al **salir del campo** con un teléfono válido se consulta si otros clientes del taller lo usan (`findByPhone`, sin contar al cliente que se edita) y se lista su nombre. El aviso solo vale mientras el campo conserve ese teléfono, se descarta la respuesta de una comprobación que ya quedó atrás, y un fallo de la consulta no molesta (el aviso es opcional).
- **Al guardar**: éxito → toast y vuelta a la lista (cuando exista el detalle, irá a él). Si falla (red, servidor), el formulario **conserva lo escrito**. En edición, si no hay cambios (comparando ya normalizado) no se llama al servidor y se avisa. Si el cliente se eliminó mientras se editaba, la página pasa a "Cliente no encontrado".
- **Desde una búsqueda sin resultados**: "Registrar nuevo cliente" abre el alta con lo buscado ya escrito (`prefillFromSearch`): un teléfono va al teléfono; un texto sin números, a nombres (la primera palabra) y apellidos (el resto).
- **Datos de otro taller**: un cliente de otro taller o eliminado no se distingue de uno inexistente ("Cliente no encontrado").

## Pendiente de la siguiente rama

- Las filas todavía no enlazan a un detalle (UC-CUST-03) y no hay un enlace "Editar" en la interfaz: la edición se alcanza por URL hasta que exista el detalle (`/customers/:id`). Con el detalle, el mensaje de identificación repetida también enlazará al cliente existente.
- La búsqueda no ignora las tildes (`Perez` no encuentra `Pérez`); es una decisión del MVP, ver el caso de uso.

## Dependencias

- `@core/auth` (`AuthFacade`, para el rol) y `@core/workshops` (`WorkshopFacade`, para el taller activo).
- `@core/supabase` (`SupabaseService`) y `@core/errors` desde el servicio.
- `@shared/components`: `Button`, `Card`, `Input`.
- No importa de otras features.

## Tests

- `customers.service.spec.ts`: parámetros de la función, página extra para `hasMore`, mapeo de filas, contacto `null` y error mapeado.
- `customer-search.spec.ts`: espera al escribir, texto sin espacios, sin repetir y texto vacío.
- `customer-card.spec.ts`: nombre y contacto según lo que llega.
- `customer-list-page.spec.ts`: carga, búsqueda, respuestas desordenadas, paginación, errores con reintento, comportamiento por rol y los botones de alta.
- `customer-form.spec.ts`: validaciones, datos emitidos normalizados, valores iniciales, aviso de teléfono y choque de identificación.
- `customer-form-page.spec.ts`: alta y edición (éxito, sin cambios, errores, cliente no encontrado) y el aviso de teléfono repetido con sus carreras.
- `customer.model.spec.ts`, `customer-prefill.spec.ts` y `customers.routes.spec.ts`: normalización, sugerencias del alta y guards de las rutas.
- La lógica de búsqueda y de roles de la base de datos se prueba en `supabase/tests/rpcs/search-customers.spec.ts`.
