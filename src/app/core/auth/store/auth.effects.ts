import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import {
  AuthenticationError,
  AuthorizationError,
  DataError,
  EmailNotConfirmedError,
} from '@core/errors';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, catchError, filter, map, of, switchMap, tap, withLatestFrom } from 'rxjs';
import { AuthActions } from './auth.actions';
import { selectIsAuthenticated, selectSessionWorkshopId } from './auth.selectors';

/** Mensaje para el usuario; los errores de dominio llevan texto técnico en inglés. */
function loginErrorMessage(error: unknown): string {
  if (error instanceof AuthenticationError) return 'Email o contraseña incorrectos.';
  if (error instanceof EmailNotConfirmedError) {
    return 'Confirma tu correo para iniciar sesión: revisa tu bandeja de entrada.';
  }
  if (error instanceof AuthorizationError) return 'Tu usuario no pertenece a ningún taller activo.';
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
}

/** Mensaje para el usuario ante un fallo de registro. */
function registerErrorMessage(error: unknown): string {
  const original = error instanceof DataError ? (error.originalError as AuthApiError) : null;
  const code = original?.code ?? '';
  const text = original?.message ?? '';
  if (code === 'user_already_exists' || /already registered/i.test(text)) {
    return 'Ya existe una cuenta con ese email. Inicia sesión.';
  }
  if (code === 'weak_password' || /password/i.test(text)) {
    return 'La contraseña no cumple los requisitos de seguridad.';
  }
  return 'No se pudo crear la cuenta. Inténtalo de nuevo.';
}

interface AuthApiError {
  code?: string;
  message?: string;
}

@Injectable()
export class AuthEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly router = inject(Router);
  private readonly service = inject(AuthService);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ email, password }) =>
        this.service.login(email, password).pipe(
          map((session) => AuthActions.loginSuccess(session)),
          catchError((error: unknown) =>
            of(AuthActions.loginFailure({ error: loginErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  restoreSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.restoreSession),
      withLatestFrom(
        this.store.select(selectSessionWorkshopId),
        this.store.select(selectIsAuthenticated),
      ),
      switchMap(([, preferredWorkshopId, wasAuthenticated]) =>
        this.service.restoreSession(preferredWorkshopId).pipe(
          map((session) =>
            session
              ? AuthActions.loginSuccess(session)
              : AuthActions.restoreSessionFailure({ wasAuthenticated }),
          ),
          catchError((error: unknown) =>
            // Sesión inválida: se descarta. Fallo transitorio (red): se conserva el estado
            // persistido, la app es online-first con tolerancia a fallos (ADR-006).
            error instanceof AuthenticationError || error instanceof AuthorizationError
              ? of(AuthActions.restoreSessionFailure({ wasAuthenticated }))
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

  /** El guard solo corre al navegar: al cerrar sesión hay que sacar al usuario de la ruta protegida. */
  logoutRedirect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logout),
        tap(() => void this.router.navigate(['/auth/login'])),
      ),
    { dispatch: false },
  );

  /** Sesión persistida que resultó inválida. Un visitante sin sesión previa no se redirige (lo hace el guard). */
  sessionExpiredRedirect$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.restoreSessionFailure),
        filter(({ wasAuthenticated }) => wasAuthenticated),
        tap(
          () =>
            void this.router.navigate(['/auth/login'], {
              queryParams: { returnUrl: this.router.url },
            }),
        ),
      ),
    { dispatch: false },
  );

  loginWithGoogle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginWithGoogle),
      switchMap(() =>
        this.service.signInWithGoogle().pipe(
          map(() => AuthActions.loginWithGoogleSuccess()),
          catchError((error: unknown) =>
            of(
              AuthActions.loginWithGoogleFailure({
                error: error instanceof Error ? error.message : 'Error desconocido',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.register),
      switchMap(({ email, password, fullName }) =>
        this.service.register(email, password, fullName).pipe(
          map(() => AuthActions.registerSuccess({ email })),
          catchError((error: unknown) =>
            of(AuthActions.registerFailure({ error: registerErrorMessage(error) })),
          ),
        ),
      ),
    ),
  );

  forgotPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.forgotPassword),
      switchMap(({ email }) =>
        this.service.forgotPassword(email).pipe(
          map(() => AuthActions.forgotPasswordSuccess()),
          catchError((error: unknown) =>
            of(
              AuthActions.forgotPasswordFailure({
                error: error instanceof Error ? error.message : 'Error desconocido',
              }),
            ),
          ),
        ),
      ),
    ),
  );

  resetPassword$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.resetPassword),
      switchMap(({ newPassword }) =>
        this.service.resetPassword(newPassword).pipe(
          map(() => AuthActions.resetPasswordSuccess()),
          catchError((error: unknown) =>
            of(
              AuthActions.resetPasswordFailure({
                error: error instanceof Error ? error.message : 'Error desconocido',
              }),
            ),
          ),
        ),
      ),
    ),
  );
}
