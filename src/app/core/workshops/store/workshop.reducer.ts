import { createReducer, on } from '@ngrx/store';

import { AuthActions } from '@core/auth';
import { initialWorkshopState } from './workshop.state';
import { WorkshopsActions } from './workshop.actions';

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
  on(WorkshopsActions.updateSuccess, (state, { workshop }) => ({
    ...state,
    available: state.available.map((w) => (w.id === workshop.id ? workshop : w)),
    active: state.active?.id === workshop.id ? workshop : state.active,
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
