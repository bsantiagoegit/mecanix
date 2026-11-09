import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthActions, AuthService } from '@core/auth';
import { initialAuthState } from '@core/auth/store/auth.state';
import { InvitationAcceptError } from '@core/errors';
import { MockStore } from '@ngrx/store/testing';
import { Subject, of, throwError } from 'rxjs';
import { provideTestStore } from '../../../../../testing/utils/store';
import { AcceptInvitationPage } from './accept-invitation-page';

const invitation = { workshopName: 'Taller Pérez', role: 'mechanic' as const };

function setup(
  options: {
    auth?: Partial<typeof initialAuthState>;
    resetPassword?: ReturnType<typeof vi.fn>;
    acceptInvitation?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const resetPassword = options.resetPassword ?? vi.fn(() => of(undefined));
  const acceptInvitation = options.acceptInvitation ?? vi.fn(() => of(undefined));
  TestBed.configureTestingModule({
    imports: [AcceptInvitationPage],
    providers: [
      provideRouter([]),
      provideTestStore({
        auth: {
          ...initialAuthState,
          isAuthenticated: true,
          user: { id: 'u1', email: 'luis@x.com', fullName: 'Luis Gómez', phone: null },
          invitation,
          ...options.auth,
        },
      }),
      { provide: AuthService, useValue: { resetPassword, acceptInvitation } },
    ],
  });
  const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(AcceptInvitationPage);
  return {
    fixture,
    resetPassword,
    acceptInvitation,
    dispatch,
    navigate,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

const valid = { password: 'secreto123', confirmPassword: 'secreto123' };

describe('AcceptInvitationPage', () => {
  it('shows the workshop, the role and a greeting', async () => {
    const { fixture, element } = setup();
    await fixture.whenStable();
    expect(element.textContent).toContain('Hola, Luis Gómez');
    expect(element.textContent).toContain('Taller Pérez');
    expect(element.textContent).toContain('mecánico');
  });

  it('does nothing with an invalid form', async () => {
    const { component, resetPassword, acceptInvitation } = setup();
    await component.onSubmit();
    expect(resetPassword).not.toHaveBeenCalled();
    expect(acceptInvitation).not.toHaveBeenCalled();
    expect(component.fieldError('password')).toBe('Este campo es obligatorio');
  });

  it('rejects a short password and a mismatch', () => {
    const { component } = setup();
    component.form.setValue({ password: '123', confirmPassword: '456' });
    component.form.markAllAsTouched();
    expect(component.fieldError('password')).toBe('Mínimo 6 caracteres');
    expect(component.fieldError('confirmPassword')).toBe('Las contraseñas no coinciden');
  });

  it('saves the password, accepts the invitation and then refreshes the session', async () => {
    const { component, resetPassword, acceptInvitation, dispatch } = setup();
    component.form.setValue(valid);
    await component.onSubmit();

    expect(resetPassword).toHaveBeenCalledWith('secreto123');
    expect(acceptInvitation).toHaveBeenCalled();
    expect(resetPassword.mock.invocationCallOrder[0]).toBeLessThan(
      acceptInvitation.mock.invocationCallOrder[0],
    );
    expect(dispatch).toHaveBeenCalledWith(AuthActions.restoreSession());
  });

  it('shows the loading state while the request is in flight', () => {
    const pending = new Subject<void>();
    const { component } = setup({ resetPassword: vi.fn(() => pending) });
    component.form.setValue(valid);
    void component.onSubmit();
    expect(component.isSubmitting()).toBe(true);
  });

  it('does not accept the invitation when the password cannot be saved', async () => {
    const { component, acceptInvitation } = setup({
      resetPassword: vi.fn(() => throwError(() => new Error('weak'))),
    });
    component.form.setValue(valid);
    await component.onSubmit();
    expect(acceptInvitation).not.toHaveBeenCalled();
    expect(component.error()).toContain('No se pudo guardar la contraseña');
    expect(component.isSubmitting()).toBe(false);
  });

  it('does not save the password again when only accepting failed', async () => {
    const acceptInvitation = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValue(of(undefined));
    const { component, resetPassword, dispatch } = setup({ acceptInvitation });
    component.form.setValue(valid);

    await component.onSubmit();
    expect(component.error()).toContain('No se pudo aceptar la invitación');

    await component.onSubmit();
    expect(resetPassword).toHaveBeenCalledTimes(1);
    expect(acceptInvitation).toHaveBeenCalledTimes(2);
    expect(component.error()).toBeNull();
    expect(dispatch).toHaveBeenCalledWith(AuthActions.restoreSession());
  });

  it('syncs the session when the invitation is no longer available', async () => {
    const { component, dispatch } = setup({
      acceptInvitation: vi.fn(() =>
        throwError(() => new InvitationAcceptError('no_pending_invitation')),
      ),
    });
    component.form.setValue(valid);
    await component.onSubmit();
    expect(component.error()).toContain('ya no está disponible');
    expect(dispatch).toHaveBeenCalledWith(AuthActions.restoreSession());
  });

  it('asks to open the link again when the session expired', async () => {
    const { component, dispatch } = setup({
      acceptInvitation: vi.fn(() =>
        throwError(() => new InvitationAcceptError('not_authenticated')),
      ),
    });
    component.form.setValue(valid);
    await component.onSubmit();
    expect(component.error()).toContain('Tu sesión expiró');
    expect(dispatch).not.toHaveBeenCalledWith(AuthActions.restoreSession());
  });

  it('goes to the dashboard once the session has a workshop', async () => {
    const { fixture, navigate } = setup({
      auth: { activeWorkshopId: 'w1', role: 'mechanic', invitation: null },
    });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('stays put while the invitation is pending', async () => {
    const { fixture, navigate } = setup();
    await fixture.whenStable();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logs out from the page', () => {
    const { component, dispatch } = setup();
    component.logout();
    expect(dispatch).toHaveBeenCalledWith(AuthActions.logout());
  });
});
