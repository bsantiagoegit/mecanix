import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject, firstValueFrom, of, throwError } from 'rxjs';
import { Action } from '@ngrx/store';
import { DataError } from '@core/errors';
import { AuthService } from '../auth.service';
import { AuthActions } from './auth.actions';
import { AuthEffects } from './auth.effects';
import { initialAuthState } from './auth.state';

describe('AuthEffects redirects', () => {
  const actions$ = new Subject<Action>();
  let navigate: ReturnType<typeof vi.spyOn>;

  function setup(currentUrl: string) {
    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideRouter([]),
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { auth: initialAuthState } }),
        { provide: AuthService, useValue: {} },
      ],
    });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue(currentUrl);
    navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    return TestBed.inject(AuthEffects);
  }

  it('sends the user to the login on logout', () => {
    const effects = setup('/dashboard');
    effects.logoutRedirect$.subscribe();
    actions$.next(AuthActions.logout());
    expect(navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('sends the user to the login with returnUrl when a persisted session turns out invalid', () => {
    const effects = setup('/work-orders/42');
    effects.sessionExpiredRedirect$.subscribe();
    actions$.next(AuthActions.restoreSessionFailure({ wasAuthenticated: true }));
    expect(navigate).toHaveBeenCalledWith(['/auth/login'], {
      queryParams: { returnUrl: '/work-orders/42' },
    });
  });

  it('does not redirect a visitor who had no session to begin with', () => {
    const effects = setup('/');
    effects.sessionExpiredRedirect$.subscribe();
    actions$.next(AuthActions.restoreSessionFailure({ wasAuthenticated: false }));
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('AuthEffects register', () => {
  const actions$ = new Subject<Action>();
  const register = vi.fn();

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideRouter([]),
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { auth: initialAuthState } }),
        { provide: AuthService, useValue: { register } },
      ],
    });
    return TestBed.inject(AuthEffects);
  }

  const request = AuthActions.register({ email: 'a@b.com', password: 'secret1', fullName: 'Ana' });

  async function resultOf(effects: AuthEffects) {
    const result = firstValueFrom(effects.register$);
    actions$.next(request);
    return result;
  }

  it('emits registerSuccess with the email', async () => {
    register.mockReturnValue(of(undefined));
    expect(await resultOf(setup())).toEqual(AuthActions.registerSuccess({ email: 'a@b.com' }));
    expect(register).toHaveBeenCalledWith('a@b.com', 'secret1', 'Ana');
  });

  it.each([
    [
      { code: 'user_already_exists', message: 'x' },
      'Ya existe una cuenta con ese email. Inicia sesión.',
    ],
    [{ message: 'User already registered' }, 'Ya existe una cuenta con ese email. Inicia sesión.'],
    [
      { code: 'weak_password', message: 'x' },
      'La contraseña no cumple los requisitos de seguridad.',
    ],
    [{ message: 'network down' }, 'No se pudo crear la cuenta. Inténtalo de nuevo.'],
  ])('maps %o to a readable message', async (original, message) => {
    register.mockReturnValue(throwError(() => new DataError(original)));
    expect(await resultOf(setup())).toEqual(AuthActions.registerFailure({ error: message }));
  });
});
