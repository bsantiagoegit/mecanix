import { AuthActions } from '@core/auth';
import { initialAuthState } from '@core/models';
import { createReducer, on } from '@ngrx/store';

export const authReducer = createReducer(
  initialAuthState,

  on(AuthActions.login, (state) => ({
    ...state,
    isLoading: true,
    error: null,
  })),

  on(AuthActions.loginSuccess, (state, { user, role, activeWorkshopId }) => ({
    ...state,
    user,
    role,
    activeWorkshopId,
    isAuthenticated: true,
    isLoading: false,
    error: null,
  })),

  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),

  on(AuthActions.logout, AuthActions.restoreSessionFailure, () => initialAuthState),

  on(AuthActions.setActiveWorkshop, (state, { workshopId, role }) => ({
    ...state,
    activeWorkshopId: workshopId,
    role,
  })),
);
