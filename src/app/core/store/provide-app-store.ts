import { isDevMode, makeEnvironmentProviders } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { AuthEffects } from '../auth/store/auth.effects';
import { authReducer } from '../auth/store/auth.reducer';
import { CatalogsEffects } from '../catalogs/store/catalogs.effects';
import { catalogsReducer } from '../catalogs/store/catalogs.reducer';
import { WorkshopEffects } from '../workshops/store/workshop.effects';
import { workshopReducer } from '../workshops/store/workshop.reducer';
import { localStorageMetaReducer } from './persistence.meta-reducer';

/** Registra el store global (D-STATE-03): slices auth, workshops y catalogs. */
export function provideAppStore() {
  return makeEnvironmentProviders([
    provideStore(
      { auth: authReducer, workshops: workshopReducer, catalogs: catalogsReducer },
      { metaReducers: [localStorageMetaReducer] },
    ),
    provideEffects([AuthEffects, WorkshopEffects, CatalogsEffects]),
    isDevMode() ? provideStoreDevtools({ maxAge: 25, logOnly: false }) : [],
  ]);
}
