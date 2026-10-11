# Plantilla de Feature

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir la estructura estándar de un feature y sus archivos. Sirve como plantilla para crear nuevos features.

---

## Estructura estándar

```
features/{feature-name}/
├── components/              ← componentes presentacionales (dumb)
├── containers/              ← componentes smart (conectan al estado)
├── services/                ← data services (acceso a Supabase)
├── models/                  ← interfaces TypeScript del dominio
├── guards/                  ← guards específicos del feature (opcional)
├── store/                   ← NgRx (solo si el feature tiene estado global)
├── {feature}.routes.ts      ← rutas del feature
└── README.md                ← documentación del feature
```

**Regla**: no todas las carpetas son obligatorias. Si un feature no tiene guards, no tiene `guards/`. Si no tiene estado global, no tiene `store/`.

---

## Ejemplo concreto: `customers`

```
features/customers/
├── components/
│   ├── customer-card.component.ts
│   ├── customer-form.component.ts
│   └── customer-search.component.ts
│
├── containers/
│   ├── customer-list.component.ts
│   ├── customer-detail.component.ts
│   ├── customer-create.component.ts
│   └── customer-edit.component.ts
│
├── services/
│   └── customers.service.ts
│
├── models/
│   ├── customer.model.ts
│   ├── create-customer.dto.ts
│   └── update-customer.dto.ts
│
├── guards/
│   └── can-edit-customer.guard.ts
│
├── customers.routes.ts
└── README.md
```

---

## Responsabilidades de cada carpeta

### `components/`

**Qué contiene**: componentes presentacionales ("dumb").

**Responsabilidades**:

- Recibir datos vía `input()`.
- Emitir eventos vía `output()`.
- Renderizar UI.
- Sin lógica de negocio.
- Sin llamadas a servicios.
- Sin acceso al store.

**Ejemplo**:

```typescript
@Component({
  selector: 'app-customer-card',
  template: `
    <div class="...">
      <h3>{{ customer().firstName }} {{ customer().lastName }}</h3>
      <p>{{ customer().phone }}</p>
      <button (click)="edit.emit(customer())">Editar</button>
    </div>
  `,
})
export class CustomerCardComponent {
  readonly customer = input.required<Customer>();
  readonly edit = output<Customer>();
}
```

### `containers/`

**Qué contiene**: componentes smart ("containers").

**Responsabilidades**:

- Inyectar servicios y store.
- Cargar datos (con `resource` o llamadas a servicios).
- Coordinar componentes presentacionales.
- Manejar navegación.
- Manejar errores.
- Mostrar toasts.

**Ejemplo**:

```typescript
@Component({
  selector: 'app-customer-list',
  imports: [CustomerCardComponent, SkeletonComponent, EmptyStateComponent],
  template: `
    @if (customers.isLoading()) {
      <app-skeleton />
    } @else if (customers.error()) {
      <app-error-state (retry)="customers.reload()" />
    } @else if (customers.value().length === 0) {
      <app-empty-state message="No hay clientes" />
    } @else {
      @for (c of customers.value(); track c.id) {
        <app-customer-card [customer]="c" (edit)="onEdit(c)" />
      }
    }
  `,
})
export class CustomerListComponent {
  private readonly customersService = inject(CustomersService);
  private readonly workshops = inject(WorkshopStore);
  private readonly router = inject(Router);

  readonly customers = resource({
    request: () => ({ workshopId: this.workshops.activeId() }),
    loader: ({ request }) => this.customersService.list(request.workshopId),
  });

  onEdit(customer: Customer) {
    this.router.navigate(['/customers', customer.id, 'edit']);
  }
}
```

### `services/`

**Qué contiene**: data services.

**Responsabilidades**:

- Encapsular todas las llamadas a Supabase.
- Transformar datos (DB → dominio).
- Mapear errores de Supabase a errores de dominio.
- Cache opcional.

**Ejemplo**:

```typescript
@Injectable({ providedIn: 'root' })
export class CustomersService {
  private readonly supabase = inject(SupabaseClient);

  async list(workshopId: string): Promise<Customer[]> {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*')
      .eq('workshop_id', workshopId)
      .is('deleted_at', null)
      .order('last_name');
    if (error) throw new DataError(error);
    return data;
  }

  async create(payload: CreateCustomerDto): Promise<Customer> {
    const { data, error } = await this.supabase.from('customers').insert(payload).select().single();
    if (error) {
      if (error.code === '23505') throw new ValidationError({ identification: 'Ya existe' });
      throw new DataError(error);
    }
    return data;
  }
}
```

### `models/`

**Qué contiene**: interfaces TypeScript.

**Responsabilidades**:

- Definir tipos del dominio.
- DTOs de creación y actualización.

**Ejemplo**:

```typescript
export interface Customer {
  id: string;
  workshopId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  identification: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CreateCustomerDto {
  workshopId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  identification?: string;
  address?: string;
}
```

**Nota**: los nombres siguen el modelo de dominio (camelCase), no el esquema de PostgreSQL (snake_case). La transformación se hace en el data service.

### `guards/`

**Qué contiene**: guards funcionales.

**Opcional**: solo si el feature tiene guards específicos.

**Ejemplo**:

```typescript
export const canEditCustomerGuard: CanActivateFn = (route) => {
  const auth = inject(AuthStore);
  return auth.hasRole('owner') || auth.hasRole('advisor');
};
```

### `store/`

**Qué contiene**: NgRx store.

**Opcional**: solo si el feature tiene **estado global** (compartido entre rutas).

**Ejemplo**:

```
store/
├── auth.actions.ts
├── auth.reducer.ts
├── auth.effects.ts
├── auth.selectors.ts
└── auth.state.ts
```

**Regla**: la mayoría de los features **no** tienen `store/`. El estado local va con signals.

### `{feature}.routes.ts`

**Qué contiene**: rutas del feature.

**Ejemplo**:

```typescript
export const customersRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    children: [
      { path: '', component: CustomerListComponent },
      { path: 'new', component: CustomerCreateComponent },
      { path: ':id', component: CustomerDetailComponent },
      { path: ':id/edit', component: CustomerEditComponent },
    ],
  },
];
```

### `README.md`

**Qué contiene**: documentación del feature.

**Estructura**:

```markdown
# Feature: {Nombre}

## Propósito

{Qué resuelve este feature}

## Casos de uso

- UC-XXX-01: {Nombre}
- UC-XXX-02: {Nombre}
- ...

## Estructura
```

features/{feature}/
├── components/
├── containers/
├── services/
├── models/
├── guards/
├── {feature}.routes.ts
└── README.md

```

## Dependencias

- Requiere: {otros features}
- Requerido por: {otros features}

## Referencias

- [Casos de uso](../../../domain/use-cases/{NN}-{feature}.md)
- [Reglas de negocio](../../../domain/business-rules.md)
- [Modelo relacional](../../data-model/tables/{NN}-{feature}.md)
```

---

## Cómo crear un feature nuevo

1. Copia la estructura de `feature-template.md`.
2. Renombra `{feature-name}` por el nombre real.
3. Crea los modelos en `models/`.
4. Crea el data service en `services/`.
5. Crea los componentes presentacionales en `components/`.
6. Crea los contenedores en `containers/`.
7. Crea las rutas en `{feature}.routes.ts`.
8. Agrega el feature a `app.routes.ts` con lazy loading.
9. Escribe el `README.md` del feature.
10. Escribe tests.

---

## Referencias

- [README de frontend](./README.md)
- [Decisiones transversales](./decisions.md)
- [Estructura](./structure.md)

---

_Plantilla de Feature v1.0_
