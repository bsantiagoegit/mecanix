import { ActionReducer } from '@ngrx/store';
import { AppState } from './app.state';

const STORAGE_KEY = 'app-state';

interface PersistedState {
  auth?: Partial<AppState['auth']>;
  workshops?: Partial<AppState['workshops']>;
  catalogs?: Partial<AppState['catalogs']>;
}

export function localStorageMetaReducer(reducer: ActionReducer<AppState>): ActionReducer<AppState> {
  return (state, action) => {
    const newState = reducer(state, action);

    if (
      action.type.startsWith('[Auth]') ||
      action.type.startsWith('[Workshops]') ||
      action.type.startsWith('[Catalogs]')
    ) {
      try {
        const persisted: PersistedState = {
          auth: pick(newState.auth, ['user', 'activeWorkshopId', 'role']),
          workshops: pick(newState.workshops, ['active']),
          catalogs: { ...newState.catalogs },
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      } catch (error) {
        console.warn('Failed to persist state:', error);
      }
    }

    return newState;
  };
}

function pick<T extends object>(obj: T, keys: (keyof T)[]): Partial<T> {
  return keys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {} as Partial<T>);
}

export function loadPersistedState(): Partial<AppState> | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}
