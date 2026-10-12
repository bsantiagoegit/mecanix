import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { AuthActions } from './auth.actions';
import { AuthService } from './auth.service';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(AuthService);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ email, password }) =>
        this.service.login(email, password).pipe(
          map(({ user, role, activeWorkshopId }) =>
            AuthActions.loginSuccess({ user, role, activeWorkshopId }),
          ),
          catchError((error) =>
            of(
              AuthActions.loginFailure({
                error: error.message ?? 'Error desconocido',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        switchMap(() => this.service.logout()),
      ),
    { dispatch: false },
  );
}
