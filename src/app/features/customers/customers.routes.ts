import { Routes } from '@angular/router';

/**
 * Rutas de la feature dentro de la app, montadas en `/customers` (bajo el shell, todos los roles).
 * Registrar y editar un cliente no tienen ruta: son un modal de la lista, solo para `owner` y
 * `advisor` (la base de datos lo exige).
 */
export const CUSTOMER_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/customer-list-page/customer-list-page').then((m) => m.CustomerListPage),
  },
];
