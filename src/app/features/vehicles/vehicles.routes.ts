import { Routes } from '@angular/router';

/**
 * Rutas de la feature dentro de la app, montadas en `/vehicles` (bajo el shell, todos los roles).
 * Registrar y editar un vehículo no tendrán ruta: serán un modal, solo para `owner` y `advisor`
 * (la base de datos lo exige).
 */
export const VEHICLE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/vehicle-list-page/vehicle-list-page').then((m) => m.VehicleListPage),
  },
];
