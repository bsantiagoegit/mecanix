import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { AuthFacade } from '@core/auth';
import { GlobalErrorHandler } from '@core/errors';
import { errorInterceptor } from '@core/interceptors';
import { provideAppStore } from '@core/store';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideAppStore(),

    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

    { provide: ErrorHandler, useClass: GlobalErrorHandler },

    provideAppInitializer(() => {
      inject(AuthFacade).restoreSession();
    }),
  ],
};
