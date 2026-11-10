import { Routes } from '@angular/router';

/** Rutas de la feature dentro de la app, montadas en `/customers` (bajo el shell, todos los roles). */
export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/customer-list-page/customer-list-page').then((m) => m.CustomerListPage),
  },
];
