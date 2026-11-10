# Feature `customers`

Los clientes del taller: las personas que llevan su vehículo. Un cliente **no es usuario del sistema** en el MVP, es un registro que el taller mantiene. Por ahora está la **lista con búsqueda**; registrar, editar y el detalle llegan en las siguientes ramas.

## Casos de uso

Definidos en [`docs/domain/use-cases/03-clientes.md`](../../../../docs/domain/use-cases/03-clientes.md).

| ID         | Caso de uso                                          | Prioridad | Estado                                              |
| ---------- | ---------------------------------------------------- | --------- | --------------------------------------------------- |
| UC-CUST-01 | Registrar cliente                                    | MVP       | Pendiente                                           |
| UC-CUST-02 | Buscar cliente por nombre, teléfono o identificación | MVP       | **Implementado** (`customer-list-page`)             |
| UC-CUST-03 | Ver detalle de cliente                               | MVP       | Pendiente                                           |
| UC-CUST-04 | Editar cliente                                       | MVP       | Pendiente                                           |
| UC-CUST-05 | Ver historial de vehículos de un cliente             | MVP       | Pendiente                                           |
| UC-CUST-06 | Eliminar cliente (soft delete)                       | Fase 2    | No iniciado (la base de datos ya limita al `owner`) |
| UC-CUST-07 | Fusionar clientes duplicados                         | Fase 3    | No iniciado                                         |

## Estructura

```
features/customers/
├── components/
│   ├── customer-card/        ← una fila de la lista: nombre y datos de contacto si el rol los ve
│   └── customer-search/      ← campo de búsqueda con espera (300 ms) y sin repetir el mismo texto
├── pages/
│   └── customer-list-page/   ← lista, búsqueda y paginación
├── services/
│   └── customers.service.ts  ← acceso a datos: llama a la función SQL search_customers
├── models/
│   └── customer.model.ts     ← CustomerSummary, CustomerPage y el tamaño de página
├── customers.routes.ts
└── README.md
```

## Rutas

| Ruta         | Página             | Protección                                                               |
| ------------ | ------------------ | ------------------------------------------------------------------------ |
| `/customers` | `CustomerListPage` | `workshopGuard` del shell: cualquier rol con taller, también el mecánico |

El enlace "Clientes" del encabezado lo ven los tres roles.

## Búsqueda y paginación

`CustomersService.search(workshopId, texto, offset)` llama a la función `search_customers` ([detalle](../../../../docs/architecture/data-model/tables/02-customers-vehicles.md)). La función, no la app, decide qué se busca y qué se devuelve: cada palabra debe coincidir en nombre, apellido, teléfono o identificación, y para el **mecánico** solo en el nombre, con el contacto en `null`. El texto viaja como parámetro; no se arman filtros `ilike` en el cliente.

- **Paginación**: 20 por página. El servicio pide una fila de más para saber si hay otra página (`hasMore`) sin hacer un conteo; "Cargar más" pide desde el `offset` de lo ya cargado y agrega.
- **Espera al escribir**: `CustomerSearch` emite el texto (sin espacios sobrantes) 300 ms después de la última tecla y solo si cambió.
- **Respuestas desordenadas**: cada búsqueda lleva un número de petición; si llega la respuesta de una búsqueda que ya quedó atrás (o de un "cargar más" anterior), se descarta.
- **Fallos**: un error al cargar se muestra como error con "Reintentar", nunca como "no hay clientes". Si falla "cargar más" se conserva lo ya cargado y se ofrece reintentar.
- **Estados**: cargando, vacío del taller ("Aún no hay clientes"), vacío de la búsqueda ("No se encontraron clientes para «…»"), error y lista.

El estado es local a la página (signals): no hay slice de NgRx porque no es estado global.

## Pendiente de las siguientes ramas

- Las filas todavía no enlazan a un detalle (UC-CUST-03) y no hay botón "Nuevo cliente" (UC-CUST-01): las rutas `/customers/new` y `/customers/:id` llegan con esas ramas.
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
- `customer-list-page.spec.ts`: carga, búsqueda, respuestas desordenadas, paginación, errores con reintento y comportamiento por rol.
- La lógica de búsqueda y de roles de la base de datos se prueba en `supabase/tests/rpcs/search-customers.spec.ts`.
