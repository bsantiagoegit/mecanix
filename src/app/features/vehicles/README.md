# Feature `vehicles`

Los vehículos que llegan al taller. Un vehículo es independiente del cliente: su dueño se guarda aparte y puede cambiar ([RT-15](../../../../docs/domain/business-rules.md)), pero siempre pertenece a un taller. Por ahora está la **lista con búsqueda**; registrar, editar y el detalle (con propietario, clave e historial de órdenes) llegan en las siguientes ramas.

## Casos de uso

Definidos en [`docs/domain/use-cases/04-vehiculos.md`](../../../../docs/domain/use-cases/04-vehiculos.md).

| ID        | Caso de uso                                      | Prioridad | Estado                                              |
| --------- | ------------------------------------------------ | --------- | --------------------------------------------------- |
| UC-VEH-01 | Registrar vehículo                               | MVP       | Pendiente (la base de datos ya está lista)          |
| UC-VEH-02 | Buscar vehículo por placa o VIN                  | MVP       | **Implementado** (`vehicle-list-page`)              |
| UC-VEH-03 | Ver detalle de vehículo                          | MVP       | Pendiente                                           |
| UC-VEH-04 | Editar vehículo                                  | MVP       | Pendiente (la base de datos ya está lista)          |
| UC-VEH-05 | Ver historial completo de órdenes de un vehículo | MVP       | Pendiente                                           |
| UC-VEH-06 | Registrar transferencia de propiedad             | Fase 2    | No iniciado                                         |
| UC-VEH-07 | Eliminar vehículo (soft delete)                  | Fase 2    | No iniciado (la base de datos ya limita al `owner`) |

## Estructura

```
features/vehicles/
├── components/
│   └── vehicle-card/         ← una fila de la lista: placa, marca, modelo, año, propietario y clave
├── pages/
│   └── vehicle-list-page/    ← lista, búsqueda y paginación
├── services/
│   └── vehicles.service.ts   ← acceso a datos: búsqueda con la función search_vehicles
├── models/
│   └── vehicle.model.ts      ← VehicleSummary, VehicleOwner, VehiclePage
├── vehicles.routes.ts
└── README.md
```

## Rutas

| Ruta        | Página            | Protección                                                               |
| ----------- | ----------------- | ------------------------------------------------------------------------ |
| `/vehicles` | `VehicleListPage` | `workshopGuard` del shell: cualquier rol con taller, también el mecánico |

El enlace "Vehículos" del encabezado lo ven los tres roles. La autoridad real es la base de datos (RLS y triggers), no el guard.

## Búsqueda y paginación

`VehiclesService.search(workshopId, texto, offset)` llama a la función `search_vehicles` ([detalle](../../../../docs/architecture/data-model/tables/02-customers-vehicles.md)). La función, no la app, decide qué se compara y qué se devuelve: el texto se compara con la **placa y el VIN sin espacios ni guiones y sin distinguir mayúsculas** (`pba 12` encuentra `PBA-1234`), y cada vehículo llega con su **propietario actual** (o `null`). El texto viaja como parámetro; no se arman filtros `ilike` en el cliente.

- **Paginación**: 20 por página. El servicio pide una fila de más para saber si hay otra página (`hasMore`) sin hacer un conteo; "Cargar más" pide desde el `offset` de lo ya cargado y agrega.
- **Espera al escribir**: `SearchBox` (componente compartido) emite el texto 300 ms después de la última tecla y solo si cambió.
- **Búsqueda en la URL**: lo buscado se guarda en `?q=` (sin añadir entradas al historial del navegador), así que se puede volver o compartir la lista tal como estaba. Con `withComponentInputBinding`, si la URL no trae `?q=` el router entrega `undefined`: la página lo trata como "sin búsqueda".
- **Respuestas desordenadas**: cada búsqueda lleva un número de petición; si llega la respuesta de una que ya quedó atrás (o de un "cargar más" anterior), se descarta.
- **Fallos**: un error al cargar se muestra como error con "Reintentar", nunca como "no hay vehículos". Si falla "cargar más" se conserva lo ya cargado y se ofrece reintentar.
- **Estados**: cargando (esqueleto de filas), vacío del taller ("Aún no hay vehículos en tu taller"), vacío de la búsqueda ("No se encontraron vehículos para «…»"), error y lista.

El estado es local a la página (signals): no hay slice de NgRx porque no es estado global.

## La fila

`VehicleCard` muestra la placa, "marca modelo · año", el VIN si lo tiene, el propietario actual ("Sin propietario actual" si no hay) y, a la derecha, la **clave**: oculta con un ojo para verla (`app-key-display`, compartido) o "Sin clave" con un candado abierto. Todos los roles ven la clave ([D-DS-17](../../../../docs/design/decisions.md)); el ocultarla es por comodidad, no por seguridad. El mecánico ve el nombre del propietario porque la base de datos se lo da por `customers_public`, sin datos de contacto.

## Pendiente de las siguientes ramas

- Registrar y editar un vehículo en un modal (con el buscador del cliente dueño) y el botón "Nuevo vehículo".
- Que cada fila enlace al detalle del vehículo, y el detalle con su propietario, la clave, el historial de órdenes y enlaces desde el cliente.
- No hay "Registrar vehículo" en el estado vacío todavía: llega con el formulario.

## Dependencias

- `@core/workshops` (`WorkshopFacade`, para el taller activo).
- `@core/supabase` (`SupabaseService`) y `@core/errors` desde el servicio.
- `@shared/components`: `Button`, `Card`, `Icon`, `KeyDisplay`, `SearchBox`, `Skeleton`.
- No importa de otras features.

## Tests

- `vehicles.service.spec.ts`: parámetros de la función, página extra para `hasMore`, mapeo de filas, propietario `null`, sin clave y error mapeado.
- `vehicle-card.spec.ts`: placa, marca, modelo y año, propietario, clave oculta o "Sin clave", VIN.
- `vehicle-list-page.spec.ts`: carga, esqueleto, búsqueda y respuestas desordenadas, búsqueda en la URL, paginación, errores con reintento y comportamiento por rol.
- `vehicles.routes.spec.ts`: que la feature solo tiene la ruta de la lista.
- `shared/components/key-display/key-display.spec.ts` y `search-box/search-box.spec.ts`: lo que hacen los componentes compartidos.
- La lógica de búsqueda, de alta y de roles de la base de datos se prueba en `supabase/tests/rpcs/search-vehicles.spec.ts`, `create-vehicle.spec.ts` y `supabase/tests/rls/vehicles-integrity.spec.ts`.
