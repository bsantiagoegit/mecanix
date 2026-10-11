# Routing

**Sistema de Gestión para Taller Mecánico Automotriz — SaaS Multi-Tenant**

- **Versión:** 1.0
- **Fecha:** Octubre 2026

---

## Propósito

Definir la estrategia de rutas, lazy loading, guards e interceptors.

---

## Estructura de rutas

### Rutas raíz (`app.routes.ts`)

```typescript
export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'work-orders', pathMatch: 'full' },
      {
        path: 'customers',
        loadChildren: () =>
          import('./features/customers/customers.routes').then((m) => m.customersRoutes),
      },
      {
        path: 'vehicles',
        loadChildren: () =>
          import('./features/vehicles/vehicles.routes').then((m) => m.vehiclesRoutes),
      },
      {
        path: 'work-orders',
        loadChildren: () =>
          import('./features/work-orders/work-orders.routes').then((m) => m.workOrdersRoutes),
      },
      {
        path: 'inspections',
        loadChildren: () =>
          import('./features/inspections/inspections.routes').then((m) => m.inspectionsRoutes),
      },
      {
        path: 'diagnoses',
        loadChildren: () =>
          import('./features/diagnoses/diagnoses.routes').then((m) => m.diagnosesRoutes),
      },
      {
        path: 'repairs',
        loadChildren: () =>
          import('./features/repairs/repairs.routes').then((m) => m.repairsRoutes),
      },
      {
        path: 'items',
        loadChildren: () => import('./features/items/items.routes').then((m) => m.itemsRoutes),
      },
      {
        path: 'quotes',
        loadChildren: () => import('./features/quotes/quotes.routes').then((m) => m.quotesRoutes),
      },
      {
        path: 'warranties',
        loadChildren: () =>
          import('./features/warranties/warranties.routes').then((m) => m.warrantiesRoutes),
      },
      {
        path: 'photos',
        loadChildren: () => import('./features/photos/photos.routes').then((m) => m.photosRoutes),
      },
      {
        path: 'pdfs',
        loadChildren: () => import('./features/pdfs/pdfs.routes').then((m) => m.pdfsRoutes),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then((m) => m.reportsRoutes),
      },
      {
        path: 'saas-admin',
        loadChildren: () =>
          import('./features/saas-admin/saas-admin.routes').then((m) => m.saasAdminRoutes),
        canActivate: [saasAdminGuard],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
```

---

## Estructura de rutas de un feature

```typescript
// features/customers/customers.routes.ts
export const customersRoutes: Routes = [
  {
    path: '',
    children: [
      { path: '', component: CustomerListComponent },
      { path: 'new', component: CustomerCreateComponent },
      { path: ':id', component: CustomerDetailComponent },
      { path: ':id/edit', component: CustomerEditComponent, canActivate: [canEditCustomerGuard] },
    ],
  },
];
```

**Convenciones**:

- `''` → listado
- `'new'` → creación
- `':id'` → detalle
- `':id/edit'` → edición

---

## Lazy loading

Todos los features se cargan con `loadChildren`. La app inicial solo carga:

- `AppShellComponent`
- `authGuard`
- El módulo raíz

**Razón**:

- Bundle inicial pequeño (~200 KB).
- El usuario solo descarga lo que necesita.
- Mejor tiempo de carga en móvil.

---

## Guards

### Guards funcionales

```typescript
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.parseUrl('/auth/login');
  }
  return true;
};

export const saasAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.isSaasAdmin();
};

export const canEditCustomerGuard: CanActivateFn = () => {
  const auth = inject(AuthStore);
  return auth.hasRole('owner') || auth.hasRole('advisor');
};
```

**Ubicación**:

- Guards globales: `core/auth/auth.guard.ts`.
- Guards específicos de un feature: `features/{feature}/guards/`.

---

## Interceptors

### Interceptor de errores

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        inject(AuthStore).logout();
      }
      return throwError(() => error);
    }),
  );
};
```

**Registro** en `app.config.ts`:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([errorInterceptor])),
    // ...
  ],
};
```

---

## Navegación programática

**Patrón**: inyectar `Router` en el contenedor y navegar después de una acción.

```typescript
async onSubmit() {
  const created = await this.customersService.create(this.form.value);
  this.router.navigate(['/customers', created.id]);
}
```

**Regla**: la navegación se hace en el contenedor, nunca en el componente presentacional.

---

## Parámetros de ruta

**Patrón**:

```typescript
export class CustomerDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly customersService = inject(CustomersService);

  readonly customerId = toSignal(this.route.paramMap.pipe(map((params) => params.get('id')!)));

  readonly customer = resource({
    request: () => ({ id: this.customerId() }),
    loader: ({ request }) => this.customersService.getById(request.id),
  });
}
```

---

## Sin resolvers

**Decisión**: no usar resolvers en MVP.

**Razón**:

- Los resolvers bloquean la navegación hasta que los datos están listos.
- Con `resource`, la pantalla se muestra con skeleton mientras carga.
- Mejor UX, especialmente en móvil con conexión lenta.

---

## Referencias

- [README de frontend](./README.md)
- [Decisiones transversales](./decisions.md)
- [Flujos de datos](./data-flow.md)
- [ADR-001: Angular 21 como framework frontend](../adr/ADR-001-angular-21.md)

---

_Routing v1.0_
