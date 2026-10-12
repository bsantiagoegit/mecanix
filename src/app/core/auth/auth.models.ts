export type Role = 'owner' | 'advisor' | 'mechanic';

export interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
}

export interface AuthState {
  user: User | null;
  activeWorkshopId: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const initialAuthState: AuthState = {
  user: null,
  activeWorkshopId: null,
  role: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};
