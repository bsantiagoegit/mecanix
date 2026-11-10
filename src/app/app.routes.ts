import { Routes } from '@angular/router';
import { onboardingGuard, roleGuard, workshopGuard } from '@core/auth';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'onboarding',
    canActivate: [onboardingGuard],
    loadChildren: () =>
      import('./features/workshops/onboarding.routes').then((m) => m.ONBOARDING_ROUTES),
  },
  {
    path: '',
    canActivate: [workshopGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'settings',
        canActivate: [roleGuard('owner')],
        loadChildren: () =>
          import('./features/workshops/workshops.routes').then((m) => m.WORKSHOP_ROUTES),
      },
      {
        path: 'customers',
        loadChildren: () =>
          import('./features/customers/customers.routes').then((m) => m.CUSTOMER_ROUTES),
      },
      {
        path: 'team',
        canActivate: [roleGuard('owner')],
        loadChildren: () =>
          import('./features/workshops/workshops.routes').then((m) => m.TEAM_ROUTES),
      },
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
