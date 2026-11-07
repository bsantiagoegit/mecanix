import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { selectIsAuthenticated, selectIsLoading } from './store/auth.selectors';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsLoading).pipe(
    filter((isLoading) => !isLoading),
    take(1),
    map(() => {
      const isAuthenticated = store.selectSignal(selectIsAuthenticated)();
      if (isAuthenticated) return true;

      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url },
      });
    }),
  );
};
