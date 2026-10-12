import { AuthState } from '../auth';
import { CatalogsState } from '../catalogs';
import { WorkshopState } from '../workshops';

export interface AppState {
  auth: AuthState;
  workshops: WorkshopState;
  catalogs: CatalogsState;
}
