import { Routes } from '@angular/router';

/** Rutas bajo `/onboarding`: usuario autenticado que todavía no tiene taller. */
export const ONBOARDING_ROUTES: Routes = [
  {
    path: 'create-workshop',
    loadComponent: () =>
      import('./pages/create-workshop-page/create-workshop-page').then((m) => m.CreateWorkshopPage),
  },
  { path: '', redirectTo: 'create-workshop', pathMatch: 'full' },
];
