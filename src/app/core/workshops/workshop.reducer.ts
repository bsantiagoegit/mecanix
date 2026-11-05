import { createReducer, on } from '@ngrx/store';

import { AuthActions } from '@core/auth';
import { initialWorkshopState } from '@core/models/';
import { WorkshopsActions } from '@core/workshops';

export const workshopReducer = createReducer(
  initialWorkshopState,
  on(AuthActions.logout, AuthActions.restoreSessionFailure, () => initialWorkshopState),
  on(WorkshopsActions.loadAvailable, (state) => ({ ...state, isLoading: true, error: null })),
  on(WorkshopsActions.loadAvailableSuccess, (state, { workshops, preferredWorkshopId }) => ({
    ...state,
    available: workshops,
    active: workshops.find((w) => w.id === preferredWorkshopId) ?? workshops[0] ?? null,
    isLoading: false,
  })),
  on(WorkshopsActions.loadAvailableFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),
  on(WorkshopsActions.switchWorkshopSuccess, (state, { workshop }) => ({
    ...state,
    active: workshop,
  })),
  on(WorkshopsActions.switchWorkshopFailure, (state, { error }) => ({
    ...state,
    error,
  })),
);
