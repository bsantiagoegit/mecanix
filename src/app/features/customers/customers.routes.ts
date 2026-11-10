import { Routes } from '@angular/router';
import { roleGuard } from '@core/auth';

/**
 * Rutas de la feature dentro de la app, montadas en `/customers` (bajo el shell). La lista la
 * ven todos los roles; editar, solo `owner` y `advisor`. Registrar es un modal de la lista.
 */
export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/customer-list-page/customer-list-page').then((m) => m.CustomerListPage),
  },
  {
    path: ':id/edit',
    canActivate: [roleGuard('owner', 'advisor')],
    loadComponent: () =>
      import('./pages/customer-edit-page/customer-edit-page').then((m) => m.CustomerEditPage),
  },
];
