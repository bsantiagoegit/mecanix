import { AuthState, CatalogsState, WorkshopState } from '@core/models';

export interface AppState {
  auth: AuthState;
  workshops: WorkshopState;
  catalogs: CatalogsState;
}
