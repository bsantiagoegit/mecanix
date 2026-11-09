import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { AuthActions } from './auth.actions';
import {
  selectAuthError,
  selectHasWorkshop,
  selectInvitation,
  selectIsAuthenticated,
  selectIsLoading,
  selectRegisteredEmail,
  selectRole,
  selectSessionWorkshopId,
  selectUser,
} from './auth.selectors';

/**
 * Facade sobre el slice NgRx `auth` (D-STATE-11). Los componentes
 * inyectan AuthFacade en vez de Store<AuthState> + selectores sueltos.
 */
@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly store = inject(Store);

  readonly user = this.store.selectSignal(selectUser);
  readonly isAuthenticated = this.store.selectSignal(selectIsAuthenticated);
  readonly isLoading = this.store.selectSignal(selectIsLoading);
  readonly error = this.store.selectSignal(selectAuthError);
  readonly activeWorkshopId = this.store.selectSignal(selectSessionWorkshopId);
  readonly role = this.store.selectSignal(selectRole);
  readonly hasWorkshop = this.store.selectSignal(selectHasWorkshop);
  readonly invitation = this.store.selectSignal(selectInvitation);
  readonly registeredEmail = this.store.selectSignal(selectRegisteredEmail);

  login(email: string, password: string): void {
    this.store.dispatch(AuthActions.login({ email, password }));
  }

  /** Descarta el error y el aviso de registro de una pantalla anterior. */
  clearError(): void {
    this.store.dispatch(AuthActions.clearError());
  }

  /** Vuelve a resolver la sesión (p. ej. tras crear el taller). */
  restoreSession(): void {
    this.store.dispatch(AuthActions.restoreSession());
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }

  hasRole(...roles: string[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }

  loginWithGoogle(): void {
    this.store.dispatch(AuthActions.loginWithGoogle());
  }

  register(email: string, password: string, fullName: string): void {
    this.store.dispatch(AuthActions.register({ email, password, fullName }));
  }

  forgotPassword(email: string): void {
    this.store.dispatch(AuthActions.forgotPassword({ email }));
  }

  resetPassword(newPassword: string): void {
    this.store.dispatch(AuthActions.resetPassword({ newPassword }));
  }
}
