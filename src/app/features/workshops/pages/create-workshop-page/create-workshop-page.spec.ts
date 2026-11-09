import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthActions } from '@core/auth';
import { initialAuthState } from '@core/auth/store/auth.state';
import { WorkshopCreationError } from '@core/errors';
import { WorkshopService } from '@core/workshops';
import { MockStore } from '@ngrx/store/testing';
import { Subject, of, throwError } from 'rxjs';
import { provideTestStore } from '../../../../../testing/utils/store';
import { CreateWorkshopPage } from './create-workshop-page';

const valid = { name: 'Taller Pérez', address: 'Av. 10, Quito', phone: '0999999999' };

function setup(
  options: { auth?: Partial<typeof initialAuthState>; create?: ReturnType<typeof vi.fn> } = {},
) {
  const create = options.create ?? vi.fn(() => of('w-1'));
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
    ],
  });
  const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CreateWorkshopPage);
  return {
    fixture,
    create,
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

  it('does not create anything with an invalid form', () => {
    const { component, create } = setup();
    component.onSubmit();
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

  it('creates the workshop and then refreshes the session', () => {
    const { component, create, dispatch } = setup();
    component.form.setValue(valid);
    component.onSubmit();
    expect(create).toHaveBeenCalledWith(valid);
    expect(dispatch).toHaveBeenCalledWith(AuthActions.restoreSession());
  });

  it('shows the loading state while the request is in flight', () => {
    const pending = new Subject<string>();
    const { component } = setup({ create: vi.fn(() => pending) });
    component.form.setValue(valid);
    component.onSubmit();
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
    component.onSubmit();
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(component.isSubmitting()).toBe(false);
  });

  it('syncs the session when the account already has a workshop', () => {
    const { component, dispatch } = setup({
      create: vi.fn(() => throwError(() => new WorkshopCreationError('user_already_has_workshop'))),
    });
    component.form.setValue(valid);
    component.onSubmit();
    expect(dispatch).toHaveBeenCalledWith(AuthActions.restoreSession());
  });

  it('shows a generic message for unexpected errors', async () => {
    const { fixture, component, element } = setup({
      create: vi.fn(() => throwError(() => new Error('boom'))),
    });
    component.form.setValue(valid);
    component.onSubmit();
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
});
