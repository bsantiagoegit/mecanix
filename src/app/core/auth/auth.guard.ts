import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';
import { selectIsAuthenticated, selectIsLoading } from './auth.selectors';

export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsLoading).pipe(
    filter((isLoading) => !isLoading),
    take(1),
    map(() => {
      const isAuthenticated = store.selectSignal(selectIsAuthenticated)();
      return isAuthenticated ? true : router.parseUrl('/auth/login');
    }),
  );
};
