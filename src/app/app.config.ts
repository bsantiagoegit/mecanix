import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, ErrorHandler, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideEffects } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';
import { provideStoreDevtools } from '@ngrx/store-devtools';

import { routes } from './app.routes';
import { AuthEffects, authReducer } from './core/auth';
import { CatalogsEffects, catalogsReducer } from './core/catalogs';
import { localStorageMetaReducer } from './core/config/persistence.meta-reducer';
import { GlobalErrorHandler } from './core/errors';
import { errorInterceptor } from './core/interceptors';
import { WorkshopEffects, workshopReducer } from './core/workshops';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([errorInterceptor])),

    provideStore(
      {
        auth: authReducer,
        workshops: workshopReducer,
        catalogs: catalogsReducer,
      },
      {
        metaReducers: [localStorageMetaReducer],
      },
    ),
    provideEffects([AuthEffects, WorkshopEffects, CatalogsEffects]),

    isDevMode() ? provideStoreDevtools({ maxAge: 25, logOnly: false }) : [],

    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
