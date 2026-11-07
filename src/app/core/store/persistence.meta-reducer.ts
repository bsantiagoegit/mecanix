import { ActionReducer, INIT, UPDATE } from '@ngrx/store';
import { AppState } from './app.state';

const STORAGE_KEY = 'app-state';

/** Campos de cada slice que se guardan y se rehidratan (D-STATE-14). */
const AUTH_KEYS: (keyof AppState['auth'])[] = ['user', 'activeWorkshopId', 'role'];
const WORKSHOPS_KEYS: (keyof AppState['workshops'])[] = ['active'];
const CATALOGS_KEYS: (keyof AppState['catalogs'])[] = ['roles'];

interface PersistedState {
  auth?: Partial<AppState['auth']>;
  workshops?: Partial<AppState['workshops']>;
  catalogs?: Partial<AppState['catalogs']>;
}

export function localStorageMetaReducer(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return (state, action) => {
    let newState = reducer(state, action);

    if (action.type === INIT || action.type === UPDATE) {
      newState = hydrate(newState, loadPersistedState());
    }

    if (
      action.type.startsWith('[Auth]') ||
      action.type.startsWith('[Workshops]') ||
      action.type.startsWith('[Catalogs]')
    ) {
      try {
        const persisted: PersistedState = {
          auth: pick(newState.auth, AUTH_KEYS),
          workshops: pick(newState.workshops, WORKSHOPS_KEYS),
          catalogs: pick(newState.catalogs, CATALOGS_KEYS),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      } catch (error) {
        console.warn('Failed to persist state:', error);
      }
    }

    return newState;
  };
}

/**
 * Mezcla lo persistido sobre el estado inicial de cada slice. Solo se
 * rehidratan los campos permitidos (lo demás en storage se ignora); flags
 * transitorios (isLoading, error) siempre arrancan en su valor inicial. `isAuthenticated` se deriva de
 * `user`; `restoreSession` lo confirma contra la sesión de Supabase.
 */
function hydrate(state: AppState, persisted: PersistedState | undefined): AppState {
  if (!persisted) return state;

  const auth = pick(persisted.auth ?? {}, AUTH_KEYS);

  return {
    auth: { ...state.auth, ...auth, isAuthenticated: (auth.user ?? null) !== null },
    workshops: { ...state.workshops, ...pick(persisted.workshops ?? {}, WORKSHOPS_KEYS) },
    catalogs: { ...state.catalogs, ...pick(persisted.catalogs ?? {}, CATALOGS_KEYS) },
  };
}

function pick<T extends object>(obj: Partial<T>, keys: (keyof T)[]): Partial<T> {
  return keys.reduce((acc, key) => {
    if (key in obj) acc[key] = obj[key];
    return acc;
  }, {} as Partial<T>);
}

function loadPersistedState(): PersistedState | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : undefined;
  } catch {
    return undefined;
  }
}
