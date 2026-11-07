import { INIT, ActionReducer } from '@ngrx/store';
import { initialAuthState } from '../auth/store/auth.state';
import { initialCatalogsState } from '../catalogs/store/catalogs.state';
import { initialWorkshopState } from '../workshops/store/workshop.state';
import { AppState } from './app.state';
import { localStorageMetaReducer } from './persistence.meta-reducer';

const KEY = 'app-state';
const initial: AppState = {
  auth: initialAuthState,
  workshops: initialWorkshopState,
  catalogs: initialCatalogsState,
};
const baseReducer: ActionReducer<AppState> = (state = initial) => state;

describe('localStorageMetaReducer', () => {
  beforeEach(() => localStorage.clear());

  it('rehydrates persisted fields over the initial state on INIT', () => {
    const user = { id: 'u1', email: 'a@b.com', fullName: 'Ana', phone: null };
    localStorage.setItem(
      KEY,
      JSON.stringify({ auth: { user, activeWorkshopId: 'w1', role: 'owner', isLoading: true } }),
    );

    const state = localStorageMetaReducer(baseReducer)(undefined, { type: INIT });

    expect(state.auth).toMatchObject({
      user,
      activeWorkshopId: 'w1',
      role: 'owner',
      isAuthenticated: true,
    });
    expect(state.auth.error).toBeNull();
    expect(state.auth.isLoading).toBe(false);
  });

  it('starts from the initial state when nothing is persisted', () => {
    expect(localStorageMetaReducer(baseReducer)(undefined, { type: INIT })).toEqual(initial);
  });

  it('ignores corrupted persisted data', () => {
    localStorage.setItem(KEY, '{not json');
    expect(localStorageMetaReducer(baseReducer)(undefined, { type: INIT })).toEqual(initial);
  });

  it('persists only the allowed fields after a store action', () => {
    const reducer: ActionReducer<AppState> = (state = initial) => ({
      ...state,
      auth: {
        ...state.auth,
        user: { id: 'u1', email: 'a@b.com', fullName: 'Ana', phone: null },
        error: 'secret-ish',
      },
    });

    localStorageMetaReducer(reducer)(undefined, { type: '[Auth] Login Success' });

    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    expect(saved.auth.user.id).toBe('u1');
    expect(saved.auth).not.toHaveProperty('error');
    expect(saved.auth).not.toHaveProperty('isLoading');
  });
});
