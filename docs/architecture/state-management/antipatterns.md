# Antipatrones

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Documentar los **antipatrones** más comunes en el manejo de estado y cómo evitarlos.

---

## Antipatrón 1: NgRx para server state

**Mal**:

```typescript
// Store de clientes en NgRx
loadCustomers = createAction('[Customers] Load');
customersLoaded = createAction('[Customers] Loaded', props<{ customers: Customer[] }>());
```

**Bien**:

```typescript
// resource en el contenedor
readonly customers = resource({
  request: () => ({ workshopId: this.workshops.activeId() }),
  loader: ({ request }) => this.customersService.list(request.workshopId),
});
```

**Por qué es malo**: el server state se cachea y se invalida en el servidor. NgRx no aporta valor aquí. Y el boilerplate es enorme.

---

## Antipatrón 2: `effect()` para derivar estado

**Mal**:

```typescript
readonly selectedItems = signal<Item[]>([]);
readonly totalCost = signal(0);

constructor() {
  effect(() => {
    this.totalCost.set(
      this.selectedItems().reduce((sum, i) => sum + i.cost * i.quantity, 0)
    );
  });
}
```

**Bien**:

```typescript
readonly selectedItems = signal<Item[]>([]);
readonly totalCost = computed(() =>
  this.selectedItems().reduce((sum, i) => sum + i.cost * i.quantity, 0)
);
```

**Por qué es malo**: `computed()` es lazy (solo recalcula si alguien lo lee), `effect()` es eager (se ejecuta siempre). `computed()` no tiene side effects.

---

## Antipatrón 3: Sincronizar signals con formularios

**Mal**:

```typescript
readonly name = signal('');
readonly form = new FormGroup({ name: new FormControl('') });

constructor() {
  effect(() => this.form.patchValue({ name: this.name() }));
  this.form.valueChanges.subscribe(v => this.name.set(v.name));
}
```

**Bien**:

```typescript
readonly form = new FormGroup({ name: new FormControl('') });
```

**Por qué es malo**: Reactive Forms tiene su propio modelo. Sincronizar con signals agrega complejidad sin beneficio.

---

## Antipatrón 4: `resource` para escrituras

**Mal**:

```typescript
readonly createCustomer = resource({
  request: () => this.form.value,
  loader: ({ request }) => this.customersService.create(request),
});
```

**Bien**:

```typescript
async onSubmit() {
  const created = await this.customersService.create(this.form.value);
  this.router.navigate(['/customers', created.id]);
}
```

**Por qué es malo**: `resource` es para consultas reactivas. Las escrituras son acciones imperativas.

---

## Antipatrón 5: NgRx para estado de un componente

**Mal**:

```typescript
// Store para el modal de cancelación de una orden
toggleCancelModal = createAction('[Order] Toggle Cancel Modal');
```

**Bien**:

```typescript
readonly showCancelModal = signal(false);
```

**Por qué es malo**: el estado del modal no trasciende el componente.

---

## Antipatrón 6: `subscribe` en `ngOnInit`

**Mal**:

```typescript
ngOnInit() {
  this.customersService.list().subscribe(customers => {
    this.customers = customers;
  });
}
```

**Bien**:

```typescript
readonly customers = resource({
  request: () => ({ workshopId: this.workshops.activeId() }),
  loader: ({ request }) => this.customersService.list(request.workshopId),
});
```

**Por qué es malo**: `subscribe` manual requiere gestión de subscripciones (memory leaks). `resource` maneja el ciclo de vida automáticamente.

---

## Antipatrón 7: Estado derivado duplicado

**Mal**:

```typescript
readonly customers = signal<Customer[]>([]);
readonly customersCount = signal(0);  // duplicado

constructor() {
  effect(() => this.customersCount.set(this.customers().length));
}
```

**Bien**:

```typescript
readonly customers = signal<Customer[]>([]);
readonly customersCount = computed(() => this.customers().length);
```

**Por qué es malo**: el estado derivado duplicado se puede desincronizar.

---

## Antipatrón 8: `localStorage` para todo

**Mal**:

```typescript
// Persistir cada cambio de cada signal
effect(() => localStorage.setItem('orders', JSON.stringify(this.orders())));
```

**Bien**:

```typescript
// Persistir solo borradores y preferencias
effect(() => {
  const draft = this.draft();
  if (draft) localStorage.setItem('draft', JSON.stringify(draft));
});
```

**Por qué es malo**: `localStorage` tiene límite de 5-10 MB. Persistir todo lo llena y degrada performance.

---

## Antipatrón 9: `effect()` para llamar a servicios

**Mal**:

```typescript
effect(() => {
  this.customersService.list().then((c) => this.customers.set(c));
});
```

**Bien**:

```typescript
readonly customers = resource({
  request: () => ({ workshopId: this.workshops.activeId() }),
  loader: ({ request }) => this.customersService.list(request.workshopId),
});
```

**Por qué es malo**: `effect()` no es para llamar a servicios. Para eso está `resource` (lecturas) o `async/await` (escrituras).

---

## Antipatrón 10: NgRx Effects para data fetching de features

**Mal**:

```typescript
// Effect que carga órdenes
loadOrders$ = createEffect(() =>
  this.actions$.pipe(
    ofType(OrdersActions.load),
    switchMap(() => this.service.list().pipe(map((orders) => OrdersActions.loaded({ orders })))),
  ),
);
```

**Bien**:

```typescript
// resource en el contenedor
readonly orders = resource({
  request: () => ({ workshopId: this.workshops.activeId() }),
  loader: ({ request }) => this.ordersService.list(request.workshopId),
});
```

**Por qué es malo**: el data fetching de features se maneja con `resource`. NgRx Effects solo para el store global.

---

## Resumen

| #   | Antipatrón                          | Reemplazo                      |
| --- | ----------------------------------- | ------------------------------ |
| 1   | NgRx para server state              | `resource`                     |
| 2   | `effect()` para derivar estado      | `computed()`                   |
| 3   | Sincronizar signals con formularios | Solo Reactive Forms            |
| 4   | `resource` para escrituras          | `async/await`                  |
| 5   | NgRx para estado de componente      | Signal local                   |
| 6   | `subscribe` en `ngOnInit`           | `resource`                     |
| 7   | Estado derivado duplicado           | `computed()`                   |
| 8   | `localStorage` para todo            | Solo borradores y preferencias |
| 9   | `effect()` para llamar a servicios  | `resource`                     |
| 10  | NgRx Effects para data fetching     | `resource`                     |

---

## Referencias

- [README de state-management](./README.md)
- [Taxonomía](./taxonomy.md)
- [Árbol de decisión](./decision-tree.md)

---

_Antipatrones v1.0_
