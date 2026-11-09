import { PendingInvitation, Role, User } from '../auth.model';
import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    // Login con email/password
    Login: props<{ email: string; password: string }>(),
    'Login Success': props<{
      user: User;
      role: Role | null;
      activeWorkshopId: string | null;
      invitation: PendingInvitation | null;
    }>(),
    'Login Failure': props<{ error: string }>(),

    // Login con Google
    'Login With Google': emptyProps(),
    'Login With Google Success': emptyProps(),
    'Login With Google Failure': props<{ error: string }>(),

    // Registro
    Register: props<{ email: string; password: string; fullName: string }>(),
    'Register Success': props<{ email: string }>(),
    'Register Failure': props<{ error: string }>(),

    // Recuperación de contraseña
    'Forgot Password': props<{ email: string }>(),
    'Forgot Password Success': emptyProps(),
    'Forgot Password Failure': props<{ error: string }>(),

    // Reset de contraseña
    'Reset Password': props<{ newPassword: string }>(),
    'Reset Password Success': emptyProps(),
    'Reset Password Failure': props<{ error: string }>(),

    // Sesión
    'Clear Error': emptyProps(),
    Logout: emptyProps(),
    'Restore Session': emptyProps(),
    // wasAuthenticated: había sesión (hidratada) que resultó inválida; sin ella no hay nada que expulsar.
    'Restore Session Failure': props<{ wasAuthenticated: boolean }>(),

    'Set Active Workshop': props<{ workshopId: string; role: Role }>(),
  },
});
