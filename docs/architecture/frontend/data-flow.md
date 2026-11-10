# Flujos de Datos

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir los flujos típicos de lectura y escritura de datos desde el frontend Angular.

---

## Flujo de lectura

Ejemplo: listar clientes.

```
1. Usuario navega a /customers
   ↓
2. Router carga lazy el feature customers
   ↓
3. CustomerListPage (página) se inicializa
   ↓
4. La página usa resource() para cargar clientes
   ↓
5. resource llama a CustomersService.list(workshopId)
   ↓
6. CustomersService llama a Supabase
   ↓
7. Supabase valida RLS y devuelve datos
   ↓
8. CustomersService transforma datos y los devuelve
   ↓
9. resource actualiza su signal (loading → success)
   ↓
10. La página pasa datos a CustomerCard (presentacional)
   ↓
11. CustomerCard renderiza
```

**Ventajas**:

- La página maneja el estado de carga con `resource`.
- El componente presentacional es puro.
- El data service encapsula Supabase.

---

## Flujo de escritura

Ejemplo: crear cliente.

```
1. Usuario llena form en CustomerCreatePage (página)
   ↓
2. Usuario toca "Guardar"
   ↓
3. La página valida el form (Reactive Forms)
   ↓
4. La página llama a CustomersService.create(dto)
   ↓
5. CustomersService llama a Supabase
   ↓
6. Supabase valida RLS y devuelve la fila creada
   ↓
7. La página muestra toast de éxito
   ↓
8. La página invalida la caché del listado (refetch)
   ↓
9. La página navega al detalle del cliente
```

**Manejo de errores**:

- Si Supabase devuelve error, el data service lo mapea a `ValidationError` o `DataError`.
- La página captura el error y muestra un mensaje.
- Si el error es de validación, se aplica al form.

---

## Flujo de actualización

Ejemplo: editar cliente.

> **Nota**: el feature real `customers` no tiene las rutas `new` ni `:id/edit`: registrar y editar son un **modal** de la lista (`CustomerListPage`), solo para `owner` y `advisor`. Ver [`features/customers`](../../../src/app/features/customers/README.md). El flujo es el mismo, pero la "navegación" es abrir y cerrar el modal; el guardado y los avisos viven en `CustomerFormState`.

```
1. Usuario navega a /customers/:id/edit
   ↓
2. CustomerEditPage (página) se inicializa
   ↓
3. La página carga el cliente con resource()
   ↓
4. La página llena el form con los datos del cliente
   ↓
5. Usuario modifica y toca "Guardar"
   ↓
6. La página valida el form
   ↓
7. La página llama a CustomersService.update(id, dto)
   ↓
8. CustomersService llama a Supabase
   ↓
9. La página muestra toast de éxito
   ↓
10. La página navega al detalle del cliente
```

---

## Flujo de eliminación (soft delete)

Ejemplo: eliminar cliente.

```
1. Usuario toca "Eliminar" en CustomerDetailPage
   ↓
2. La página muestra modal de confirmación
   ↓
3. Usuario confirma
   ↓
4. La página llama a CustomersService.softDelete(id)
   ↓
5. CustomersService llama a Supabase (UPDATE deleted_at = now())
   ↓
6. La página muestra toast de éxito
   ↓
7. La página navega al listado
```

---

## Flujo de upload de foto

Ejemplo: subir foto del intake.

```
1. Usuario toca "Tomar foto" en el intake
   ↓
2. Cliente obtiene el archivo (File o Blob)
   ↓
3. Cliente valida MIME type y tamaño
   ↓
4. Cliente comprime y redimensiona (browser-image-compression)
   ↓
5. Si es HEIC, convierte a JPEG (heic2any)
   ↓
6. Cliente genera UUID v4 para el nombre del archivo
   ↓
7. Cliente construye el path
   ↓
8. Cliente sube a Storage: supabase.storage.from('photos').upload(path, blob)
   ↓
9. Cliente inserta fila en photos con metadata
   ↓
10. Si el INSERT falla, cliente elimina el archivo subido (rollback manual)
```

**Detalle**: ver [Estrategia de Storage](../storage/upload-flow.md).

---

## Uso de `resource`

**Patrón típico**:

```typescript
export class CustomerListPage {
  private readonly customersService = inject(CustomersService);
  private readonly workshops = inject(WorkshopFacade);

  readonly customers = resource({
    request: () => ({ workshopId: this.workshops.activeId() }),
    loader: ({ request }) => this.customersService.list(request.workshopId),
  });
}
```

**Estados**:

- `customers.isLoading()` — `true` mientras carga.
- `customers.error()` — el error, si falló.
- `customers.value()` — los datos, si cargó.
- `customers.reload()` — recarga.

**En el template**:

```html
@if (customers.isLoading()) {
<app-skeleton />
} @else if (customers.error()) {
<app-error-state (retry)="customers.reload()" />
} @else { @for (c of customers.value(); track c.id) {
<app-customer-card [customer]="c" />
} }
```

---

## Invalidación de caché

Cuando una escritura afecta a una lectura cacheada, se debe invalidar.

**Patrón**:

```typescript
async onSubmit() {
  await this.customersService.create(this.form.value);
  this.customers.reload(); // invalidar y recargar
  this.router.navigate(['/customers']);
}
```

**Nota**: `resource` no tiene invalidación automática. La página decide cuándo recargar.

---

## Referencias

- [README de frontend](./README.md)
- [Decisiones transversales](./decisions.md)
- [Manejo de errores](./error-handling.md)
- [Estrategia de Storage](../storage/upload-flow.md)

---

_Flujos de Datos v1.0_
