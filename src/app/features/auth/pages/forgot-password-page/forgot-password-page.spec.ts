import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@core/auth';
import { PasswordRecoveryError } from '@core/errors';
import { Subject, of, throwError } from 'rxjs';
import { provideTestStore } from '../../../../../testing/utils/store';
import { ForgotPasswordPage } from './forgot-password-page';

function setup(forgotPassword: ReturnType<typeof vi.fn> = vi.fn(() => of(undefined))) {
  TestBed.configureTestingModule({
    imports: [ForgotPasswordPage],
    providers: [
      provideRouter([]),
      provideTestStore(),
      { provide: AuthService, useValue: { forgotPassword } },
    ],
  });
  const fixture = TestBed.createComponent(ForgotPasswordPage);
  return {
    fixture,
    forgotPassword,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('ForgotPasswordPage', () => {
  it('asks for the email and links back to the login', async () => {
    const { fixture, element } = setup();
    await fixture.whenStable();
    expect(element.textContent).toContain('Recuperar contraseña');
    const hrefs = Array.from(element.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/auth/login');
  });

  it('does not send anything with an empty or malformed email', async () => {
    const { component, forgotPassword } = setup();
    await component.onSubmit();
    expect(forgotPassword).not.toHaveBeenCalled();
    expect(component.fieldError('email')).toBe('Este campo es obligatorio');

    component.form.setValue({ email: 'ana@example' });
    component.form.markAllAsTouched();
    expect(component.fieldError('email')).toBe('Email inválido');
  });

  it('strips surrounding spaces from the email', () => {
    const { component } = setup();
    component.form.controls.email.setValue('  ana@example.com ');
    expect(component.form.controls.email.value).toBe('ana@example.com');
  });

  it('sends the link and shows the neutral confirmation', async () => {
    const { fixture, component, forgotPassword, element } = setup();
    component.form.setValue({ email: 'ana@example.com' });
    await component.onSubmit();
    await fixture.whenStable();

    expect(forgotPassword).toHaveBeenCalledWith('ana@example.com');
    expect(component.sentTo()).toBe('ana@example.com');
    expect(element.textContent).toContain('Si existe una cuenta con');
    expect(element.textContent).toContain('ana@example.com');
  });

  it('shows the loading state while the request is in flight', () => {
    const pending = new Subject<void>();
    const { component } = setup(vi.fn(() => pending));
    component.form.setValue({ email: 'ana@example.com' });
    void component.onSubmit();
    expect(component.isSubmitting()).toBe(true);
  });

  it('explains the rate limit', async () => {
    const { fixture, component, element } = setup(
      vi.fn(() => throwError(() => new PasswordRecoveryError('rate_limited'))),
    );
    component.form.setValue({ email: 'ana@example.com' });
    await component.onSubmit();
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Espera unos minutos');
    expect(component.sentTo()).toBeNull();
    expect(component.isSubmitting()).toBe(false);
  });

  it('shows a generic message for unexpected errors', async () => {
    const { component } = setup(vi.fn(() => throwError(() => new Error('boom'))));
    component.form.setValue({ email: 'ana@example.com' });
    await component.onSubmit();
    expect(component.error()).toContain('No se pudo enviar');
  });

  it('lets the user try another email after sending', async () => {
    const { component } = setup();
    component.form.setValue({ email: 'ana@example.com' });
    await component.onSubmit();
    component.useAnotherEmail();
    expect(component.sentTo()).toBeNull();
    expect(component.form.getRawValue().email).toBe('');
  });
});
