import { createReducer, on } from '@ngrx/store';
import { CatalogsActions } from './catalogs.actions';
import { initialCatalogsState } from './catalogs.models';

export const catalogsReducer = createReducer(
  initialCatalogsState,
  on(CatalogsActions.loadCatalogs, (state) => ({
    ...state,
    isLoading: true,
  })),
  on(CatalogsActions.loadRolesSuccess, (state, { roles }) => ({
    ...state,
    roles,
    isLoading: false,
  })),
  on(CatalogsActions.loadCatalogsFailure, (state, { error }) => ({
    ...state,
    isLoading: false,
    error,
  })),
);
