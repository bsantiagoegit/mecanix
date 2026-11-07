import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { Action } from '@ngrx/store';
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
