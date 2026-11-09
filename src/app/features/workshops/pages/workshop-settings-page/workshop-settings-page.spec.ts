import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { AuthorizationError } from '@core/errors';
import { Workshop } from '@core/workshops';
import { initialWorkshopState } from '@core/workshops/store/workshop.state';
import { WorkshopsActions } from '@core/workshops/store/workshop.actions';
import { MockStore } from '@ngrx/store/testing';
import { ToastService } from '@shared/services/toast.service';
import { provideTestStore } from '../../../../../testing/utils/store';
import { LogoPicker } from '../../components/logo-picker/logo-picker';
import { LogoError } from '../../services/workshop-logo.service';
import { WorkshopSettingsService } from '../../services/workshop-settings.service';
import { WorkshopSettingsPage } from './workshop-settings-page';

const workshop: Workshop = {
  id: 'w1',
  name: 'Taller Pérez',
  address: 'Av. 10, Quito',
  phone: '0999999999',
  logoUrl: 'https://x.test/old.png',
  capacity: 6,
  minIntakePhotos: 4,
  quoteExpirationDays: 10,
  warrantyDays: 30,
  currency: 'USD',
  timezone: 'America/Guayaquil',
};

function setup(active: Workshop | null = workshop) {
  const save = vi.fn().mockResolvedValue({ ...workshop, name: 'Nuevo nombre' });
  TestBed.configureTestingModule({
    imports: [WorkshopSettingsPage],
    providers: [
      provideRouter([]),
      provideTestStore({
        workshops: { ...initialWorkshopState, available: active ? [active] : [], active },
      }),
      { provide: WorkshopSettingsService, useValue: { save } },
    ],
  });
  const dispatch = vi.spyOn(TestBed.inject(MockStore), 'dispatch');
  const fixture = TestBed.createComponent(WorkshopSettingsPage);
  return {
    fixture,
    save,
    dispatch,
    toast: TestBed.inject(ToastService),
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

const png = () => new File(['x'], 'logo.png', { type: 'image/png' });

describe('WorkshopSettingsPage', () => {
  it('loads the active workshop into the form', async () => {
    const { fixture, component } = setup();
    await fixture.whenStable();
    expect(component.form.getRawValue()).toEqual({
      name: 'Taller Pérez',
      address: 'Av. 10, Quito',
      phone: '0999999999',
      capacity: '6',
      minIntakePhotos: '4',
      quoteExpirationDays: '10',
      warrantyDays: '30',
      currency: 'USD',
      timezone: 'America/Guayaquil',
    });
  });

  it('shows the current logo, or a placeholder when there is none', async () => {
    const withLogo = setup();
    await withLogo.fixture.whenStable();
    expect(withLogo.element.querySelector('img')?.getAttribute('src')).toBe(
      'https://x.test/old.png',
    );
    TestBed.resetTestingModule();

    const without = setup({ ...workshop, logoUrl: null });
    await without.fixture.whenStable();
    expect(without.element.querySelector('img')).toBeNull();
    expect(without.element.textContent).toContain('Sin logo');
  });

  it('validates the fields', async () => {
    const { fixture, component } = setup();
    await fixture.whenStable();
    component.form.patchValue({
      name: '',
      capacity: '0',
      warrantyDays: 'abc',
      currency: 'usd',
      timezone: 'Mars/Base',
      phone: 'x',
    });
    component.form.markAllAsTouched();

    expect(component.fieldError('name')).toBe('Este campo es obligatorio');
    expect(component.fieldError('capacity')).toBe('Debe ser un número entero mayor que 0');
    expect(component.fieldError('warrantyDays')).toBe('Debe ser un número entero mayor que 0');
    expect(component.fieldError('currency')).toContain('3 letras');
    expect(component.fieldError('timezone')).toContain('Zona horaria inválida');
    expect(component.fieldError('phone')).toContain('Teléfono inválido');
  });

  it('does not save an invalid form', async () => {
    const { fixture, component, save } = setup();
    await fixture.whenStable();
    component.form.patchValue({ name: '' });
    await component.onSubmit();
    expect(save).not.toHaveBeenCalled();
  });

  it('saves the data as numbers, updates the store and confirms with a toast', async () => {
    const { fixture, component, save, dispatch, toast } = setup();
    await fixture.whenStable();
    const success = vi.spyOn(toast, 'success');
    component.form.patchValue({ name: '  Nuevo nombre ', capacity: '8' });

    await component.onSubmit();

    expect(save).toHaveBeenCalledWith(
      workshop,
      expect.objectContaining({ name: 'Nuevo nombre', capacity: 8, warrantyDays: 30 }),
      { file: null, remove: false },
    );
    expect(dispatch).toHaveBeenCalledWith(
      WorkshopsActions.updateSuccess({ workshop: { ...workshop, name: 'Nuevo nombre' } }),
    );
    expect(success).toHaveBeenCalledWith('Cambios guardados');
    expect(component.isSaving()).toBe(false);
  });

  it('sends the logo the picker reports and resets the picker after saving', async () => {
    const { fixture, component, save } = setup();
    await fixture.whenStable();
    const file = png();

    const picker = fixture.debugElement.query(By.directive(LogoPicker));
    picker.triggerEventHandler('changed', { file, remove: false });
    await component.onSubmit();

    expect(save).toHaveBeenCalledWith(workshop, expect.anything(), { file, remove: false });
    expect(component.logo()).toEqual({ file: null, remove: false });
  });

  it('asks to remove the current logo when the picker says so', async () => {
    const { fixture, component, save } = setup();
    await fixture.whenStable();

    fixture.debugElement
      .query(By.directive(LogoPicker))
      .triggerEventHandler('changed', { file: null, remove: true });
    await component.onSubmit();

    expect(save).toHaveBeenCalledWith(workshop, expect.anything(), { file: null, remove: true });
  });

  it('gives the picker the current logo', async () => {
    const { fixture } = setup();
    await fixture.whenStable();
    expect(
      fixture.debugElement.query(By.directive(LogoPicker)).componentInstance.currentUrl(),
    ).toBe('https://x.test/old.png');
  });

  it('shows a readable message for each kind of failure', async () => {
    const { fixture, component, save, element } = setup();
    await fixture.whenStable();

    save.mockRejectedValueOnce(new LogoError('upload_failed'));
    await component.onSubmit();
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo subir el logo',
    );

    save.mockRejectedValueOnce(new AuthorizationError());
    await component.onSubmit();
    expect(component.error()).toContain('Solo el dueño');

    save.mockRejectedValueOnce(new Error('boom'));
    await component.onSubmit();
    expect(component.error()).toContain('No se pudieron guardar');
    expect(component.isSaving()).toBe(false);
  });
});
