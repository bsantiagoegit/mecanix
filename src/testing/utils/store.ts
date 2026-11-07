import { initialAuthState } from '@core/auth/store/auth.state';
import { initialCatalogsState } from '@core/catalogs/store/catalogs.state';
import { initialWorkshopState } from '@core/workshops/store/workshop.state';
import { provideMockStore } from '@ngrx/store/testing';

/** Store global falso con el estado inicial de cada slice, para specs de componentes. */
export function provideTestStore(initialState = {}) {
  return provideMockStore({
    initialState: {
      auth: initialAuthState,
      workshops: initialWorkshopState,
      catalogs: initialCatalogsState,
      ...initialState,
    },
  });
}
