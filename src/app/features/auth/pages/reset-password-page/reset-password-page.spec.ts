import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthActions, AuthService } from '@core/auth';
import { initialAuthState } from '@core/auth/store/auth.state';
import { PasswordRecoveryError } from '@core/errors';
import { MockStore } from '@ngrx/store/testing';
import { ToastService } from '@shared/services/toast.service';
import { Subject, of, throwError } from 'rxjs';
import { provideTestStore } from '../../../../../testing/utils/store';
import { ResetPasswordPage } from './reset-password-page';

const valid = { password: 'nueva-clave', confirmPassword: 'nueva-clave' };

function setup(
  options: {
    hasSession?: ReturnType<typeof vi.fn>;
    recoverPassword?: ReturnType<typeof vi.fn>;
    auth?: Partial<typeof initialAuthState>;
  } = {},
) {
  const hasSession = options.hasSession ?? vi.fn(() => of(true));
  const recoverPassword = options.recoverPassword ?? vi.fn(() => of(undefined));
  TestBed.configureTestingModule({
    imports: [ResetPasswordPage],
    providers: [
      provideRouter([]),
      provideTestStore({ auth: { ...initialAuthState, ...options.auth } }),
      { provide: AuthService, useValue: { hasSession, recoverPassword } },
    ],
  });
  const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(ResetPasswordPage);
  return {
    fixture,
    recoverPassword,
    dispatch,
    navigate,
    toast: TestBed.inject(ToastService),
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

async function ready(s: ReturnType<typeof setup>) {
  await s.fixture.whenStable();
  s.fixture.detectChanges();
}

describe('ResetPasswordPage', () => {
  it('shows the form when the email link opened a session', async () => {
    const s = setup();
    await ready(s);
    expect(s.component.linkState()).toBe('ready');
    expect(s.element.textContent).toContain('Nueva contraseña');
  });

  it('says the link is invalid when there is no session, with a way to ask for another', async () => {
    const s = setup({ hasSession: vi.fn(() => of(false)) });
    await ready(s);
    expect(s.component.linkState()).toBe('invalid');
    expect(s.element.textContent).toContain('El enlace no es válido');
    const hrefs = Array.from(s.element.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/auth/forgot-password');
  });

  it('treats a failure checking the session as an invalid link', async () => {
    const s = setup({ hasSession: vi.fn(() => throwError(() => new Error('x'))) });
    await ready(s);
    expect(s.component.linkState()).toBe('invalid');
  });

  it('waits while it checks the link', () => {
    const s = setup({ hasSession: vi.fn(() => new Subject<boolean>()) });
    expect(s.component.linkState()).toBe('checking');
  });

  it('does nothing with an invalid form', async () => {
    const s = setup();
    await s.component.onSubmit();
    expect(s.recoverPassword).not.toHaveBeenCalled();
    expect(s.component.fieldError('password')).toBe('Este campo es obligatorio');
  });

  it('rejects a short password and a mismatch', () => {
    const { component } = setup();
    component.form.setValue({ password: '123', confirmPassword: '456' });
    component.form.markAllAsTouched();
    expect(component.fieldError('password')).toBe('Mínimo 6 caracteres');
    expect(component.fieldError('confirmPassword')).toBe('Las contraseñas no coinciden');
  });

  it('changes the password, thanks the user and refreshes the session', async () => {
    const s = setup();
    const success = vi.spyOn(s.toast, 'success');
    s.component.form.setValue(valid);
    await s.component.onSubmit();

    expect(s.recoverPassword).toHaveBeenCalledWith('nueva-clave');
    expect(success).toHaveBeenCalledWith('Contraseña actualizada');
    expect(s.dispatch).toHaveBeenCalledWith(AuthActions.restoreSession());
  });

  it('enters the app only once the session is resolved', async () => {
    const s = setup();
    s.component.form.setValue(valid);
    await s.component.onSubmit();
    await s.fixture.whenStable();
    expect(s.navigate).not.toHaveBeenCalled();

    TestBed.inject(MockStore).setState({
      auth: { ...initialAuthState, isAuthenticated: true },
      workshops: {} as never,
      catalogs: {} as never,
    });
    await s.fixture.whenStable();
    expect(s.navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('shows the loading state while the request is in flight', () => {
    const pending = new Subject<void>();
    const s = setup({ recoverPassword: vi.fn(() => pending) });
    s.component.form.setValue(valid);
    void s.component.onSubmit();
    expect(s.component.isSubmitting()).toBe(true);
  });

  it.each([
    ['same_password', 'distinta a la actual'],
    ['weak_password', 'requisitos de seguridad'],
  ] as const)('explains "%s"', async (reason, text) => {
    const s = setup({
      recoverPassword: vi.fn(() => throwError(() => new PasswordRecoveryError(reason))),
    });
    s.component.form.setValue(valid);
    await s.component.onSubmit();
    expect(s.component.error()).toContain(text);
    expect(s.component.isSubmitting()).toBe(false);
    expect(s.dispatch).not.toHaveBeenCalledWith(AuthActions.restoreSession());
  });

  it('shows the invalid link message when the session expired meanwhile', async () => {
    const s = setup({
      recoverPassword: vi.fn(() => throwError(() => new PasswordRecoveryError('no_session'))),
    });
    s.component.form.setValue(valid);
    await s.component.onSubmit();
    expect(s.component.linkState()).toBe('invalid');
  });

  it('shows a generic message for unexpected errors', async () => {
    const s = setup({ recoverPassword: vi.fn(() => throwError(() => new Error('boom'))) });
    s.component.form.setValue(valid);
    await s.component.onSubmit();
    expect(s.component.error()).toContain('No se pudo cambiar');
  });
});
