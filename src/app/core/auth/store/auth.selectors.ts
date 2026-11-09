import { AuthState } from './auth.state';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectUser = createSelector(selectAuthState, (s) => s.user);
export const selectRole = createSelector(selectAuthState, (s) => s.role);
export const selectIsAuthenticated = createSelector(selectAuthState, (s) => s.isAuthenticated);
/** Taller de la sesión (el contra el que se resolvió el rol). No confundir con `selectActiveWorkshopId` de workshops. */
export const selectSessionWorkshopId = createSelector(selectAuthState, (s) => s.activeWorkshopId);
/** Invitación pendiente de aceptar; `null` si no hay (o si ya tiene taller). */
export const selectInvitation = createSelector(selectAuthState, (s) => s.invitation ?? null);
export const selectIsLoading = createSelector(selectAuthState, (s) => s.isLoading);
export const selectAuthError = createSelector(selectAuthState, (s) => s.error);
export const selectRegisteredEmail = createSelector(selectAuthState, (s) => s.registeredEmail);
/** Autenticado y con taller. Sin taller el usuario debe crear el suyo (UC-WS-08). */
export const selectHasWorkshop = createSelector(
  selectAuthState,
  (s) => s.activeWorkshopId !== null,
);
