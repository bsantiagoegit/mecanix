# Ejemplos Concretos

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Mostrar ejemplos concretos de cómo se combinan las herramientas de estado en casos de uso reales.

---

## Ejemplo 1: Lista de órdenes con filtros

**Componente**: `WorkOrderListComponent` (container).

**Estado utilizado**:

- `resource` para el server state.
- Signal en servicio para los filtros.
- NgRx (`workshops`) para el taller activo.

```typescript
@Component({...})
export class WorkOrderListComponent {
  private readonly service = inject(WorkOrdersService);
  private readonly filters = inject(WorkOrderFiltersState);
  private readonly workshops = inject(WorkshopStore);

  readonly orders = resource({
    request: () => ({
      workshopId: this.workshops.activeId(),
      status: this.filters.status(),
      dateFrom: this.filters.dateFrom(),
      dateTo: this.filters.dateTo(),
    }),
    loader: ({ request }) => this.service.list(request),
  });
}
```

**Servicio de filtros**:

```typescript
@Injectable({ providedIn: 'root' })
export class WorkOrderFiltersState {
  readonly status = signal<WorkOrderStatus | null>(null);
  readonly dateFrom = signal<Date | null>(null);
  readonly dateTo = signal<Date | null>(null);

  readonly hasFilters = computed(
    () => this.status() !== null || this.dateFrom() !== null || this.dateTo() !== null,
  );

  reset() {
    this.status.set(null);
    this.dateFrom.set(null);
    this.dateTo.set(null);
  }
}
```

---

## Ejemplo 2: Formulario de creación de cliente

**Componente**: `CustomerCreateComponent` (container).

**Estado utilizado**:

- Reactive Forms para el formulario.
- Signal local para `isSubmitting`.
- NgRx (`workshops`) para el taller activo.
- Data service para la escritura.

```typescript
@Component({...})
export class CustomerCreateComponent {
  private readonly service = inject(CustomersService);
  private readonly workshops = inject(WorkshopStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly form = inject(FormBuilder).group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', Validators.email],
    identification: [''],
    address: [''],
  });

  readonly isSubmitting = signal(false);

  async onSubmit() {
    if (this.form.invalid) return;
    this.isSubmitting.set(true);
    try {
      const created = await this.service.create({
        workshopId: this.workshops.activeId()!,
        ...this.form.value,
      } as CreateCustomerDto);
      this.toast.success('Cliente creado');
      this.router.navigate(['/customers', created.id]);
    } catch (error) {
      this.handleError(error);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
```

---

## Ejemplo 3: Detalle de orden con tabs

**Componente**: `WorkOrderDetailComponent` (container).

**Estado utilizado**:

- `resource` para el detalle.
- Signal local para la tab activa.
- `computed()` para el total.

```typescript
@Component({...})
export class WorkOrderDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(WorkOrdersService);

  readonly workOrderId = toSignal(
    this.route.paramMap.pipe(map(p => p.get('id')!)),
  );

  readonly workOrder = resource({
    request: () => ({ id: this.workOrderId() }),
    loader: ({ request }) => this.service.getById(request.id),
  });

  readonly activeTab = signal<'summary' | 'photos' | 'history'>('summary');

  readonly totalRepairsCost = computed(() => {
    const wo = this.workOrder.value();
    if (!wo) return 0;
    return wo.recommendedRepairs.reduce((sum, r) => sum + r.estimatedCost, 0);
  });
}
```

---

## Ejemplo 4: Cambio de taller activo

**Componente**: `WorkshopSwitcherComponent` (presentacional).

**Estado utilizado**:

- NgRx (`workshops`) para el taller activo.

```typescript
@Component({...})
export class WorkshopSwitcherComponent {
  private readonly store = inject(Store);

  readonly available = this.store.selectSignal(selectAvailableWorkshops);
  readonly active = this.store.selectSignal(selectActiveWorkshop);

  switchTo(workshopId: string) {
    this.store.dispatch(WorkshopsActions.switchWorkshop({ workshopId }));
  }
}
```

**Effect en `core/workshops/`**:

```typescript
switchWorkshop$ = createEffect(() =>
  this.actions$.pipe(
    ofType(WorkshopsActions.switchWorkshop),
    switchMap(({ workshopId }) =>
      this.service.setActive(workshopId).pipe(
        map(() => WorkshopsActions.switchSuccess({ workshopId })),
        catchError((error) => of(WorkshopsActions.switchFailure({ error }))),
      ),
    ),
  ),
);
```

---

## Ejemplo 5: Borrador de orden de trabajo

**Componente**: `WorkOrderCreateComponent` (container).

**Estado utilizado**:

- Reactive Forms para el formulario.
- `localStorage` + `effect()` para el borrador.

```typescript
@Component({...})
export class WorkOrderCreateComponent {
  private readonly draft = inject(WorkOrderDraftService);

  readonly form = inject(FormBuilder).group({
    customerId: ['', Validators.required],
    vehicleId: ['', Validators.required],
    reportedProblem: ['', Validators.required],
  });

  constructor() {
    // Restaurar borrador si existe
    const saved = this.draft.draft();
    if (saved) {
      this.form.patchValue(saved);
    }

    // Guardar borrador en cada cambio (con debounce)
    effect(() => {
      this.draft.draft.set(this.form.value);
    });
  }

  async onSubmit() {
    if (this.form.invalid) return;
    const created = await this.service.create(this.form.value);
    this.draft.clear();
    this.router.navigate(['/work-orders', created.id]);
  }
}
```

**Servicio de borrador**:

```typescript
@Injectable({ providedIn: 'root' })
export class WorkOrderDraftService {
  readonly draft = signal<Partial<WorkOrderForm> | null>(this.load());

  constructor() {
    effect(() => {
      const value = this.draft();
      if (value) {
        localStorage.setItem('work-order-draft', JSON.stringify(value));
      } else {
        localStorage.removeItem('work-order-draft');
      }
    });
  }

  clear() {
    this.draft.set(null);
  }

  private load(): Partial<WorkOrderForm> | null {
    const raw = localStorage.getItem('work-order-draft');
    return raw ? JSON.parse(raw) : null;
  }
}
```

---

## Ejemplo 6: Selector de mecánico en formulario de orden

**Componente**: `MechanicSelectComponent` (presentacional).

**Estado utilizado**:

- `resource` para la lista de mecánicos.
- `input()` + `output()` para comunicarse con el contenedor.

```typescript
@Component({
  selector: 'app-mechanic-select',
  template: `
    <select [value]="selectedId()" (change)="onChange($event)">
      <option value="">Seleccionar mecánico</option>
      @for (m of mechanics.value() ?? []; track m.id) {
        <option [value]="m.id">{{ m.fullName }}</option>
      }
    </select>
  `,
})
export class MechanicSelectComponent {
  private readonly service = inject(UsersService);
  private readonly workshops = inject(WorkshopStore);

  readonly selectedId = input<string | null>(null);
  readonly selected = output<string>();

  readonly mechanics = resource({
    request: () => ({
      workshopId: this.workshops.activeId(),
      role: 'mechanic',
    }),
    loader: ({ request }) => this.service.listByRole(request.workshopId, request.role),
  });

  onChange(event: Event) {
    this.selected.emit((event.target as HTMLSelectElement).value);
  }
}
```

---

## Referencias

- [README de state-management](./README.md)
- [Decisiones transversales](./decisions.md)
- [Arquitectura Frontend](../frontend/README.md)

---

_Ejemplos Concretos v1.0_
