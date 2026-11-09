import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthActions } from '@core/auth';
import { initialAuthState } from '@core/auth/store/auth.state';
import { WorkshopCreationError } from '@core/errors';
import { WorkshopService } from '@core/workshops';
import { MockStore } from '@ngrx/store/testing';
import { Subject, of, throwError } from 'rxjs';
import { ToastService } from '@shared/services/toast.service';
import { WorkshopSettingsService } from '../../services/workshop-settings.service';
import { provideTestStore } from '../../../../../testing/utils/store';
import { CreateWorkshopPage } from './create-workshop-page';

const valid = { name: 'Taller Pérez', address: 'Av. 10, Quito', phone: '0999999999' };

function setup(
  options: {
    auth?: Partial<typeof initialAuthState>;
    create?: ReturnType<typeof vi.fn>;
    attachLogo?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const create = options.create ?? vi.fn(() => of('w-1'));
  const attachLogo = options.attachLogo ?? vi.fn().mockResolvedValue(undefined);
  TestBed.configureTestingModule({
    imports: [CreateWorkshopPage],
    providers: [
      provideRouter([]),
      provideTestStore({
        auth: {
          ...initialAuthState,
          isAuthenticated: true,
          user: { id: 'u1', email: 'a@x.com', fullName: 'Ana Pérez', phone: null },
          ...options.auth,
        },
      }),
      { provide: WorkshopService, useValue: { create } },
      { provide: WorkshopSettingsService, useValue: { attachLogo } },
    ],
  });
  const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CreateWorkshopPage);
  return {
    fixture,
    create,
    attachLogo,
    toast: TestBed.inject(ToastService),
    dispatch,
    navigate,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('CreateWorkshopPage', () => {
  it('greets the user', async () => {
    const { fixture, element } = setup();
    await fixture.whenStable();
    expect(element.textContent).toContain('Hola, Ana Pérez');
  });

  it('does not create anything with an invalid form', async () => {
    const { component, create } = setup();
    await component.onSubmit();
    expect(create).not.toHaveBeenCalled();
    expect(component.fieldError('name')).toBe('Este campo es obligatorio');
  });

  it('rejects a malformed phone', () => {
    const { component } = setup();
    component.form.setValue({ ...valid, phone: 'abc' });
    component.form.markAllAsTouched();
    expect(component.fieldError('phone')).toContain('Teléfono inválido');
  });

  it('strips surrounding spaces from the fields', () => {
    const { component } = setup();
    component.form.controls.name.setValue('  Taller Pérez ');
    expect(component.form.controls.name.value).toBe('Taller Pérez');
  });

  it('creates the workshop and then refreshes the session', async () => {
    const { component, create, dispatch } = setup();
    component.form.setValue(valid);
    await component.onSubmit();
    expect(create).toHaveBeenCalledWith(valid);
    expect(dispatch).toHaveBeenCalledWith(AuthActions.restoreSession());
  });

  it('shows the loading state while the request is in flight', () => {
    const pending = new Subject<string>();
    const { component } = setup({ create: vi.fn(() => pending) });
    component.form.setValue(valid);
    void component.onSubmit();
    expect(component.isSubmitting()).toBe(true);
  });

  it.each([
    ['email_not_confirmed', 'Confirma tu correo antes de crear un taller.'],
    ['invalid_workshop_data', 'Revisa los datos del taller.'],
  ] as const)('shows a readable message for "%s"', async (reason, message) => {
    const { fixture, component, element } = setup({
      create: vi.fn(() => throwError(() => new WorkshopCreationError(reason))),
    });
    component.form.setValue(valid);
    await component.onSubmit();
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(component.isSubmitting()).toBe(false);
  });

  it('syncs the session when the account already has a workshop', async () => {
    const { component, dispatch } = setup({
      create: vi.fn(() => throwError(() => new WorkshopCreationError('user_already_has_workshop'))),
    });
    component.form.setValue(valid);
    await component.onSubmit();
    expect(dispatch).toHaveBeenCalledWith(AuthActions.restoreSession());
  });

  it('shows a generic message for unexpected errors', async () => {
    const { fixture, component, element } = setup({
      create: vi.fn(() => throwError(() => new Error('boom'))),
    });
    component.form.setValue(valid);
    await component.onSubmit();
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('No se pudo crear');
  });

  it('goes to the dashboard once the session has a workshop', async () => {
    const { fixture, navigate } = setup({ auth: { activeWorkshopId: 'w-1', role: 'owner' } });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('stays put while there is no workshop', async () => {
    const { fixture, navigate } = setup();
    await fixture.whenStable();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logs out from the page', () => {
    const { component, dispatch } = setup();
    component.logout();
    expect(dispatch).toHaveBeenCalledWith(AuthActions.logout());
  });

  describe('optional logo', () => {
    const logoFile = new File(['x'], 'logo.png', { type: 'image/png' });
    const withLogo = (component: CreateWorkshopPage) =>
      component.logo.set({ file: logoFile, remove: false });

    it('does not touch Storage when no logo was chosen', async () => {
      const { component, attachLogo } = setup();
      component.form.setValue(valid);
      await component.onSubmit();
      expect(attachLogo).not.toHaveBeenCalled();
    });

    it('uploads the chosen logo for the new workshop, then refreshes the session', async () => {
      const { component, attachLogo, dispatch } = setup();
      component.form.setValue(valid);
      withLogo(component);
      await component.onSubmit();

      expect(attachLogo).toHaveBeenCalledWith('w-1', logoFile);
      expect(dispatch).toHaveBeenCalledWith(AuthActions.restoreSession());
    });

    it('creates the workshop first: a failed creation never uploads the logo', async () => {
      const { component, attachLogo } = setup({
        create: vi.fn(() => throwError(() => new WorkshopCreationError('invalid_workshop_data'))),
      });
      component.form.setValue(valid);
      withLogo(component);
      await component.onSubmit();
      expect(attachLogo).not.toHaveBeenCalled();
    });

    it('does not block the sign-up when the logo fails: it warns and enters the app', async () => {
      const { component, toast, dispatch } = setup({
        attachLogo: vi.fn().mockRejectedValue(new Error('storage down')),
      });
      const warning = vi.spyOn(toast, 'warning');
      component.form.setValue(valid);
      withLogo(component);
      await component.onSubmit();

      expect(warning).toHaveBeenCalledWith(
        expect.stringContaining('Taller creado, pero no se pudo subir el logo'),
        8000,
      );
      expect(dispatch).toHaveBeenCalledWith(AuthActions.restoreSession());
      expect(component.error()).toBeNull();
    });

    it('shows the logo picker as optional', async () => {
      const { fixture, element } = setup();
      await fixture.whenStable();
      expect(element.textContent).toContain('Logo (opcional)');
      expect(element.querySelector('app-logo-picker')).not.toBeNull();
    });
  });
});
