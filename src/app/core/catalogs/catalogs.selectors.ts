import { CatalogsState } from '@core/models';
import { createFeatureSelector, createSelector } from '@ngrx/store';

export const selectCatalogsState = createFeatureSelector<CatalogsState>('catalogs');

export const selectRoles = createSelector(selectCatalogsState, (s) => s.roles);
export const selectCatalogsLoading = createSelector(selectCatalogsState, (s) => s.isLoading);
export const selectCatalogsError = createSelector(selectCatalogsState, (s) => s.error);
