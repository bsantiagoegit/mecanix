import { Routes } from '@angular/router';
import { roleGuard } from '@core/auth';

/**
 * Rutas de la feature dentro de la app, montadas en `/customers` (bajo el shell). La lista la
 * ven todos los roles; registrar y editar, solo `owner` y `advisor`.
 */
export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/customer-list-page/customer-list-page').then((m) => m.CustomerListPage),
  },
  {
    path: 'new',
    canActivate: [roleGuard('owner', 'advisor')],
    loadComponent: () =>
      import('./pages/customer-form-page/customer-form-page').then((m) => m.CustomerFormPage),
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard('owner', 'advisor')],
    loadComponent: () =>
      import('./pages/customer-form-page/customer-form-page').then((m) => m.CustomerFormPage),
  },
];
