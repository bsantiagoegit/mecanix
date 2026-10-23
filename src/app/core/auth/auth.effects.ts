import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, catchError, map, of, switchMap, withLatestFrom } from 'rxjs';
import { AuthenticationError, AuthorizationError } from '../errors';
import { AuthActions } from './auth.actions';
import { selectSessionWorkshopId } from './auth.selectors';
import { AuthService } from './auth.service';

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly service = inject(AuthService);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ email, password }) =>
        this.service.login(email, password).pipe(
          map((session) => AuthActions.loginSuccess(session)),
          catchError((error: unknown) =>
            of(
              AuthActions.loginFailure({
                error: error instanceof Error ? error.message : 'Error desconocido',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  restoreSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.restoreSession),
      withLatestFrom(this.store.select(selectSessionWorkshopId)),
      switchMap(([, preferredWorkshopId]) =>
        this.service.restoreSession(preferredWorkshopId).pipe(
          map((session) =>
            session ? AuthActions.loginSuccess(session) : AuthActions.restoreSessionFailure(),
          ),
          catchError((error: unknown) =>
            // Sesión inválida: se descarta. Fallo transitorio (red): se conserva el estado
            // persistido, la app es online-first con tolerancia a fallos (ADR-006).
            error instanceof AuthenticationError || error instanceof AuthorizationError
              ? of(AuthActions.restoreSessionFailure())
              : EMPTY,
          ),
        ),
      ),
    ),
  );

  logout$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout, AuthActions.restoreSessionFailure),
        switchMap(() => this.service.logout()),
      ),
    { dispatch: false },
  );
}
