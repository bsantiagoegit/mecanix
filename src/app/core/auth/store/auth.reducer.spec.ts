import { AuthSession } from '../auth.model';
import { AuthActions } from './auth.actions';
import { authReducer } from './auth.reducer';
import { initialAuthState } from './auth.state';

const session: AuthSession = {
  user: { id: 'u1', email: 'a@b.com', fullName: 'Ana', phone: null },
  role: 'advisor',
  activeWorkshopId: 'w1',
};

describe('authReducer', () => {
  it('marks the state as loading on login and clears the previous error', () => {
    const state = authReducer({ ...initialAuthState, error: 'x' }, AuthActions.login({ email: 'a', password: 'b' }));
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('stores the session on loginSuccess', () => {
    const state = authReducer({ ...initialAuthState, isLoading: true }, AuthActions.loginSuccess(session));
    expect(state).toMatchObject({ ...session, isAuthenticated: true, isLoading: false, error: null });
  });

  it('stores the error on loginFailure', () => {
    const state = authReducer({ ...initialAuthState, isLoading: true }, AuthActions.loginFailure({ error: 'bad' }));
    expect(state).toMatchObject({ isLoading: false, error: 'bad', isAuthenticated: false });
  });

  it.each([
    ['logout', AuthActions.logout()],
    ['restoreSessionFailure', AuthActions.restoreSessionFailure()],
  ])('resets to the initial state on %s', (_name, action) => {
    const logged = authReducer(initialAuthState, AuthActions.loginSuccess(session));
    expect(authReducer(logged, action)).toEqual(initialAuthState);
  });

  it('updates workshop and role together on setActiveWorkshop', () => {
    const logged = authReducer(initialAuthState, AuthActions.loginSuccess(session));
    const state = authReducer(logged, AuthActions.setActiveWorkshop({ workshopId: 'w2', role: 'owner' }));
    expect(state).toMatchObject({ activeWorkshopId: 'w2', role: 'owner' });
  });
});
