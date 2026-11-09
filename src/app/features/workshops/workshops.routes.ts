import { Routes } from '@angular/router';

/** Rutas de la feature dentro de la app, montadas en `/settings` (bajo el shell, solo `owner`). */
export const WORKSHOP_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/workshop-settings-page/workshop-settings-page').then(
        (m) => m.WorkshopSettingsPage,
      ),
  },
];
