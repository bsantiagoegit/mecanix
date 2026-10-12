import { createReducer, on } from '@ngrx/store';

import { WorkshopsActions } from './workshop.actions';
import { initialWorkshopState } from './workshop.models';

export const workshopReducer = createReducer(
  initialWorkshopState,
  on(WorkshopsActions.loadAvailable, (state) => ({ ...state, isLoading: true, error: null })),
  on(WorkshopsActions.loadAvailableSuccess, (state, { workshops }) => ({
    ...state,
    available: workshops,
    active: state.active ?? workshops[0] ?? null,
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
