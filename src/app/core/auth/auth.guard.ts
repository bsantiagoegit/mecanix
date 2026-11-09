import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';
import { selectHasWorkshop, selectIsAuthenticated, selectIsLoading } from './store/auth.selectors';

type Requirement = 'authenticated' | 'workshop' | 'no-workshop';

/** Espera a que termine la carga de la sesión y decide según el estado resultante. */
function sessionGuard(requirement: Requirement): CanActivateFn {
  return (_route, state) => {
    const store = inject(Store);
    const router = inject(Router);

    return store.select(selectIsLoading).pipe(
      filter((isLoading) => !isLoading),
      take(1),
      map((): boolean | UrlTree => {
        const isAuthenticated = store.selectSignal(selectIsAuthenticated)();
        if (!isAuthenticated) {
          return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
        }
        if (requirement === 'authenticated') return true;

        const hasWorkshop = store.selectSignal(selectHasWorkshop)();
        if (requirement === 'workshop') {
          return hasWorkshop ? true : router.createUrlTree(['/onboarding/create-workshop']);
        }
        return hasWorkshop ? router.createUrlTree(['/']) : true;
      }),
    );
  };
}

/** Exige sesión; no mira si tiene taller. */
export const authGuard: CanActivateFn = sessionGuard('authenticated');

/** Rutas de la app: exige sesión **y** taller. Sin taller lleva a crear el suyo. */
export const workshopGuard: CanActivateFn = sessionGuard('workshop');

/** Onboarding: exige sesión **sin** taller. Quien ya tiene taller vuelve a la app. */
export const onboardingGuard: CanActivateFn = sessionGuard('no-workshop');
