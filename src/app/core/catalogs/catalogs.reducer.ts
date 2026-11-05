import { createReducer, on } from '@ngrx/store';
import { initialCatalogsState } from '../models/catalogs.models';
import { CatalogsActions } from './catalogs.actions';

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
