import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Role, User } from './auth.models';

export const AuthActions = createActionGroup({
  source: 'Auth',
  events: {
    Login: props<{ email: string; password: string }>(),
    'Login Success': props<{
      user: User;
      role: Role;
      activeWorkshopId: string;
    }>(),
    'Login Failure': props<{ error: string }>(),

    Logout: emptyProps(),

    'Restore Session': emptyProps(),

    'Set Active Workshop': props<{ workshopId: string }>(),
  },
});
