import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthActions } from '@core/auth/store/auth.actions';
import { initialAuthState } from '@core/auth/store/auth.state';
import { MockStore } from '@ngrx/store/testing';
import { provideTestStore } from '../../../../../testing/utils/store';
import { RegisterPage } from './register-page';

function setup(auth: Partial<typeof initialAuthState> = {}) {
  TestBed.configureTestingModule({
    imports: [RegisterPage],
    providers: [provideRouter([]), provideTestStore({ auth: { ...initialAuthState, ...auth } })],
  });
  const store = TestBed.inject(MockStore);
  const dispatch = vi.spyOn(store, 'dispatch');
  const fixture = TestBed.createComponent(RegisterPage);
  return {
    fixture,
    dispatch,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

const valid = {
  fullName: ' Ana Pérez ',
  email: 'ana@example.com',
  password: 'secreto1',
  confirmPassword: 'secreto1',
};

describe('RegisterPage', () => {
  it('should create', () => {
    expect(setup().component).toBeTruthy();
  });

  it('clears a stale error from another screen when it opens', () => {
    const { dispatch } = setup({ error: 'Email o contraseña incorrectos.' });
    expect(dispatch).toHaveBeenCalledWith(AuthActions.clearError());
  });

  it('registers trimming the name when the form is valid', () => {
    const { component, dispatch } = setup();
    component.form.setValue(valid);
    component.onSubmit();
    expect(dispatch).toHaveBeenCalledWith(
      AuthActions.register({
        email: 'ana@example.com',
        password: 'secreto1',
        fullName: 'Ana Pérez',
      }),
    );
  });

  it('does not register an invalid form and marks the fields as touched', () => {
    const { component, dispatch } = setup();
    component.onSubmit();
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: '[Auth] Register' }));
    expect(component.fieldError('email')).toBe('Este campo es obligatorio');
  });

  it('rejects an email without a real domain', () => {
    const { component } = setup();
    component.form.setValue({ ...valid, email: 'ana@example' });
    component.form.markAllAsTouched();
    expect(component.fieldError('email')).toBe('Email inválido');
  });

  it('strips spaces pasted around the email instead of flagging it', () => {
    const { component } = setup();
    component.form.controls.email.setValue('  ana@example.com ');
    expect(component.form.controls.email.value).toBe('ana@example.com');
    expect(component.form.controls.email.valid).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const { component, dispatch } = setup();
    component.form.setValue({ ...valid, confirmPassword: 'otra-clave' });
    component.onSubmit();
    expect(component.fieldError('confirmPassword')).toBe('Las contraseñas no coinciden');
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: '[Auth] Register' }));
  });

  it('rejects short passwords and invalid emails', () => {
    const { component } = setup();
    component.form.setValue({ ...valid, password: '123', confirmPassword: '123', email: 'x' });
    component.form.markAllAsTouched();
    expect(component.fieldError('password')).toBe('Mínimo 6 caracteres');
    expect(component.fieldError('email')).toBe('Email inválido');
  });

  it('shows the registration error', async () => {
    const { fixture, element } = setup({
      error: 'Ya existe una cuenta con ese email. Inicia sesión.',
    });
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Ya existe una cuenta');
  });

  it('shows the confirmation instead of the form once the account exists', async () => {
    const { fixture, element } = setup({ registeredEmail: 'ana@example.com' });
    await fixture.whenStable();
    expect(element.querySelector('form')).toBeNull();
    const status = element.querySelector('[role="status"]')?.textContent ?? '';
    expect(status).toContain('ana@example.com');
    expect(status).toContain('correo de confirmación');
    expect(element.querySelector('a')?.getAttribute('href')).toBe('/auth/login');
  });

  it('links back to the login', async () => {
    const { fixture, element } = setup();
    await fixture.whenStable();
    const hrefs = Array.from(element.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/auth/login');
  });
});
