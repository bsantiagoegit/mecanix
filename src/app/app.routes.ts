import { Routes } from '@angular/router';
import { onboardingGuard, workshopGuard } from '@core/auth';

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
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
