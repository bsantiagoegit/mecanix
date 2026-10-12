import { createReducer, on } from '@ngrx/store';
import { AuthActions } from './auth.actions';
import { initialAuthState } from './auth.models';

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

  on(AuthActions.logout, () => initialAuthState),

  on(AuthActions.setActiveWorkshop, (state, { workshopId }) => ({
    ...state,
    activeWorkshopId: workshopId,
  })),
);
