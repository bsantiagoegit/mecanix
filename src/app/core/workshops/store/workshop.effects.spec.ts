import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Action } from '@ngrx/store';
import { provideMockStore } from '@ngrx/store/testing';
import { Subject } from 'rxjs';
import { AuthActions, AuthService } from '@core/auth';
import { initialAuthState } from '@core/auth/store/auth.state';
import { WorkshopService } from '../workshop.service';
import { WorkshopsActions } from './workshop.actions';
import { WorkshopEffects } from './workshop.effects';

describe('WorkshopEffects.loadOnSession$', () => {
  const actions$ = new Subject<Action>();
  const user = { id: 'u1', email: 'a@x.com', fullName: 'Ana', phone: null };

  function setup() {
    TestBed.configureTestingModule({
      providers: [
        WorkshopEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { auth: initialAuthState } }),
        { provide: WorkshopService, useValue: {} },
        { provide: AuthService, useValue: {} },
      ],
    });
    return TestBed.inject(WorkshopEffects);
  }

  it('loads the workshops once a user with a workshop logs in', () => {
    const emitted: Action[] = [];
    setup().loadOnSession$.subscribe((a) => emitted.push(a));
    actions$.next(AuthActions.loginSuccess({ user, role: 'owner', activeWorkshopId: 'w1' }));
    expect(emitted).toEqual([WorkshopsActions.loadAvailable()]);
  });

  it('loads nothing for a user who has no workshop yet', () => {
    const emitted: Action[] = [];
    setup().loadOnSession$.subscribe((a) => emitted.push(a));
    actions$.next(AuthActions.loginSuccess({ user, role: null, activeWorkshopId: null }));
    expect(emitted).toEqual([]);
  });
});
