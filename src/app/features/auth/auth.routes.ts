import { Routes } from '@angular/router';
import { invitationGuard } from '@core/auth';

export const AUTH_ROUTES: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register-page/register-page').then((m) => m.RegisterPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password-page/forgot-password-page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password-page/reset-password-page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'accept-invitation',
    canActivate: [invitationGuard],
    loadComponent: () =>
      import('./pages/accept-invitation-page/accept-invitation-page').then(
        (m) => m.AcceptInvitationPage,
      ),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
];
