import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { AuthActions } from './auth.actions';
import {
  selectActiveWorkshopId,
  selectAuthError,
  selectIsAuthenticated,
  selectIsLoading,
  selectRole,
  selectUser,
} from './auth.selectors';

/**
 * Facade sobre el slice NgRx `auth` (D-STATE-11). Los componentes
 * inyectan AuthStore en vez de Store<AuthState> + selectores sueltos.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly store = inject(Store);

  readonly user = this.store.selectSignal(selectUser);
  readonly isAuthenticated = this.store.selectSignal(selectIsAuthenticated);
  readonly isLoading = this.store.selectSignal(selectIsLoading);
  readonly error = this.store.selectSignal(selectAuthError);
  readonly activeWorkshopId = this.store.selectSignal(selectActiveWorkshopId);
  readonly role = this.store.selectSignal(selectRole);

  login(email: string, password: string): void {
    this.store.dispatch(AuthActions.login({ email, password }));
  }

  logout(): void {
    this.store.dispatch(AuthActions.logout());
  }

  hasRole(...roles: string[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }
}
