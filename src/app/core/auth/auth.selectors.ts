import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from './auth.models';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectUser = createSelector(selectAuthState, (s) => s.user);
export const selectRole = createSelector(selectAuthState, (s) => s.role);
export const selectIsAuthenticated = createSelector(selectAuthState, (s) => s.isAuthenticated);
export const selectActiveWorkshopId = createSelector(selectAuthState, (s) => s.activeWorkshopId);
export const selectIsLoading = createSelector(selectAuthState, (s) => s.isLoading);
export const selectAuthError = createSelector(selectAuthState, (s) => s.error);
