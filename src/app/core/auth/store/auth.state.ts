import { PendingInvitation, Role, User } from '../auth.model';

export interface AuthState {
  user: User | null;
  activeWorkshopId: string | null;
  role: Role | null;
  /** Invitación pendiente de aceptar (solo si no hay taller). */
  invitation: PendingInvitation | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Email de la cuenta recién creada (transitorio, no se persiste). */
  registeredEmail: string | null;
}

export const initialAuthState: AuthState = {
  user: null,
  activeWorkshopId: null,
  role: null,
  invitation: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  registeredEmail: null,
};
