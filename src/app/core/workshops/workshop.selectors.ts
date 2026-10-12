import { createFeatureSelector, createSelector } from '@ngrx/store';
import { WorkshopState } from './workshop.models';

export const selectWorkshopState = createFeatureSelector<WorkshopState>('workshops');

export const selectAvailableWorkshops = createSelector(selectWorkshopState, (s) => s.available);
export const selectActiveWorkshop = createSelector(selectWorkshopState, (s) => s.active);
export const selectActiveWorkshopId = createSelector(selectActiveWorkshop, (w) => w?.id ?? null);
export const selectWorkshopsLoading = createSelector(selectWorkshopState, (s) => s.isLoading);
export const selectWorkshopsError = createSelector(selectWorkshopState, (s) => s.error);
