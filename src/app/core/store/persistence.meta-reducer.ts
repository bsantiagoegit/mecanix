import { ActionReducer, INIT, UPDATE } from '@ngrx/store';
import { AppState } from './app.state';

const STORAGE_KEY = 'app-state';

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
          auth: pick(newState.auth, ['user', 'activeWorkshopId', 'role']),
          workshops: pick(newState.workshops, ['active']),
          catalogs: pick(newState.catalogs, ['roles']),
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
 * rehidratan los campos de `pick`; flags transitorios (isLoading, error)
 * siempre arrancan en su valor inicial. `isAuthenticated` se deriva de
 * `user`; `restoreSession` lo confirma contra la sesión de Supabase.
 */
function hydrate(state: AppState, persisted: PersistedState | undefined): AppState {
  if (!persisted) return state;

  return {
    auth: {
      ...state.auth,
      ...persisted.auth,
      isAuthenticated: (persisted.auth?.user ?? null) !== null,
    },
    workshops: { ...state.workshops, ...persisted.workshops },
    catalogs: { ...state.catalogs, ...persisted.catalogs },
  };
}

function pick<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key];
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
