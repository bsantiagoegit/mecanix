import { AuthSession } from '../auth.model';
import { AuthActions } from './auth.actions';
import { authReducer } from './auth.reducer';
import { initialAuthState } from './auth.state';

const session: AuthSession = {
  user: { id: 'u1', email: 'a@b.com', fullName: 'Ana', phone: null },
  role: 'advisor',
  activeWorkshopId: 'w1',
  invitation: null,
};

describe('authReducer', () => {
  it('marks the state as loading on login and clears the previous error', () => {
    const state = authReducer(
      { ...initialAuthState, error: 'x' },
      AuthActions.login({ email: 'a', password: 'b' }),
    );
    expect(state.isLoading).toBe(true);
    expect(state.error).toBeNull();
  });

  it('stores the session on loginSuccess', () => {
    const state = authReducer(
      { ...initialAuthState, isLoading: true },
      AuthActions.loginSuccess(session),
    );
    expect(state).toMatchObject({
      ...session,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  it('stores the error on loginFailure', () => {
    const state = authReducer(
      { ...initialAuthState, isLoading: true },
      AuthActions.loginFailure({ error: 'bad' }),
    );
    expect(state).toMatchObject({ isLoading: false, error: 'bad', isAuthenticated: false });
  });

  it.each([
    ['logout', AuthActions.logout()],
    ['restoreSessionFailure', AuthActions.restoreSessionFailure({ wasAuthenticated: true })],
  ])('resets to the initial state on %s', (_name, action) => {
    const logged = authReducer(initialAuthState, AuthActions.loginSuccess(session));
    expect(authReducer(logged, action)).toEqual(initialAuthState);
  });

  it('updates workshop and role together on setActiveWorkshop', () => {
    const logged = authReducer(initialAuthState, AuthActions.loginSuccess(session));
    const state = authReducer(
      logged,
      AuthActions.setActiveWorkshop({ workshopId: 'w2', role: 'owner' }),
    );
    expect(state).toMatchObject({ activeWorkshopId: 'w2', role: 'owner' });
  });

  it('accepts a session without workshop (a user who must still create theirs)', () => {
    const state = authReducer(
      { ...initialAuthState, isLoading: true },
      AuthActions.loginSuccess({
        user: session.user,
        role: null,
        activeWorkshopId: null,
        invitation: null,
      }),
    );
    expect(state).toMatchObject({
      user: session.user,
      role: null,
      activeWorkshopId: null,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe('registration', () => {
    it('starts loading and clears previous error and confirmation', () => {
      const state = authReducer(
        { ...initialAuthState, error: 'x', registeredEmail: 'old@x.com' },
        AuthActions.register({ email: 'a@b.com', password: 'secret', fullName: 'Ana' }),
      );
      expect(state).toMatchObject({ isLoading: true, error: null, registeredEmail: null });
    });

    it('keeps the user logged out and stores the new account email on success', () => {
      const state = authReducer(
        { ...initialAuthState, isLoading: true },
        AuthActions.registerSuccess({ email: 'a@b.com' }),
      );
      expect(state).toMatchObject({
        isLoading: false,
        registeredEmail: 'a@b.com',
        isAuthenticated: false,
        user: null,
      });
    });

    it('stores the error on failure', () => {
      const state = authReducer(
        { ...initialAuthState, isLoading: true },
        AuthActions.registerFailure({ error: 'boom' }),
      );
      expect(state).toMatchObject({ isLoading: false, error: 'boom' });
    });

    it('clearError drops the error and the confirmation', () => {
      const state = authReducer(
        { ...initialAuthState, error: 'x', registeredEmail: 'a@b.com' },
        AuthActions.clearError(),
      );
      expect(state).toMatchObject({ error: null, registeredEmail: null });
    });
  });

  it('keeps a pending invitation for a user without workshop', () => {
    const invitation = { workshopName: 'Taller Pérez', role: 'advisor' as const };
    const state = authReducer(
      initialAuthState,
      AuthActions.loginSuccess({
        user: session.user,
        role: null,
        activeWorkshopId: null,
        invitation,
      }),
    );
    expect(state.invitation).toEqual(invitation);
  });

  it('clears the invitation once a workshop is active', () => {
    const state = authReducer(
      {
        ...initialAuthState,
        invitation: { workshopName: 'Taller Pérez', role: 'advisor' },
      },
      AuthActions.setActiveWorkshop({ workshopId: 'w1', role: 'advisor' }),
    );
    expect(state.invitation).toBeNull();
  });
});
