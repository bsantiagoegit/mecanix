import { AuthState } from '../auth/store/auth.state';
import { CatalogsState } from '../catalogs/store/catalogs.state';
import { WorkshopState } from '../workshops/store/workshop.state';

export interface AppState {
  auth: AuthState;
  workshops: WorkshopState;
  catalogs: CatalogsState;
}
