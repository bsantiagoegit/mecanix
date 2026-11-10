import { TestBed } from '@angular/core/testing';
import { CustomerInput } from '../../models/customer.model';
import { CustomerForm } from './customer-form';

const filled = {
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '0987654321',
  email: '',
  identification: '',
  address: '',
};

function setup(inputs: Record<string, unknown> = {}) {
  TestBed.configureTestingModule({ imports: [CustomerForm] });
  const fixture = TestBed.createComponent(CustomerForm);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  const submitted: CustomerInput[] = [];
  const phones: string[] = [];
  fixture.componentInstance.submitted.subscribe((v) => submitted.push(v));
  fixture.componentInstance.phoneChecked.subscribe((v) => phones.push(v));
  fixture.detectChanges();
  return {
    fixture,
    submitted,
    phones,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('CustomerForm', () => {
  describe('validation', () => {
    it('does not submit an empty form and marks the required fields', () => {
      const { component, submitted } = setup();
      component.onSubmit();
      expect(submitted).toEqual([]);
      expect(component.fieldError('firstName')).toBe('Este campo es obligatorio');
      expect(component.fieldError('lastName')).toBe('Este campo es obligatorio');
      expect(component.fieldError('phone')).toBe('Este campo es obligatorio');
    });

    it('does not require the optional fields', () => {
      const { component, submitted } = setup();
      component.form.setValue(filled);
      component.onSubmit();
      expect(submitted).toHaveLength(1);
    });

    it.each(['abc', '123456', '1'.repeat(21), '09876abc21'])('rejects the phone "%s"', (phone) => {
      const { component } = setup();
      component.form.patchValue({ phone });
      component.form.markAllAsTouched();
      expect(component.fieldError('phone')).toContain('Teléfono inválido');
    });

    it.each(['0987654321', '+593 98 765 4321', '(02) 255-1234'])(
      'accepts the phone "%s"',
      (phone) => {
        const { component } = setup();
        component.form.patchValue({ phone });
        component.form.markAllAsTouched();
        expect(component.fieldError('phone')).toBe('');
      },
    );

    it('rejects an email without a domain extension', () => {
      const { component } = setup();
      component.form.patchValue({ email: 'ana@example' });
      component.form.markAllAsTouched();
      expect(component.fieldError('email')).toBe('Email inválido');
    });

    it.each([
      ['firstName', 121],
      ['lastName', 121],
      ['identification', 21],
      ['address', 201],
    ])('rejects a %s that is too long', (field, length) => {
      const { component } = setup();
      component.form.patchValue({ [field]: 'a'.repeat(length) });
      component.form.markAllAsTouched();
      expect(component.fieldError(field)).toBe('Es demasiado largo');
    });

    it('strips surrounding spaces while typing', () => {
      const { component } = setup();
      component.form.controls.firstName.setValue('  Ana ');
      expect(component.form.controls.firstName.value).toBe('Ana');
    });
  });

  describe('submitting', () => {
    it('emits the normalized data', () => {
      const { component, submitted } = setup();
      component.form.setValue({ ...filled, identification: 'ab123x', email: 'ana@example.com' });
      component.onSubmit();
      expect(submitted[0]).toEqual({
        firstName: 'Ana',
        lastName: 'Pérez',
        phone: '0987654321',
        email: 'ana@example.com',
        identification: 'AB123X',
        address: null,
      });
    });

    it('shows the label and the loading state it receives', () => {
      const { element } = setup({ submitLabel: 'Registrar cliente', isSubmitting: true });
      expect(element.textContent).toContain('Registrar cliente');
      expect(element.querySelector('button[type="submit"]')?.hasAttribute('disabled')).toBe(true);
    });

    it('shows a cancel button only when asked, and emits cancelled', () => {
      const { fixture, element, component } = setup();
      expect(element.textContent).not.toContain('Cancelar');

      fixture.componentRef.setInput('cancellable', true);
      fixture.detectChanges();
      let cancelled = 0;
      component.cancelled.subscribe(() => cancelled++);
      const button = Array.from(element.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Cancelar'),
      );
      button?.click();
      expect(cancelled).toBe(1);
    });

    it('shows the error it receives', () => {
      const { element } = setup({ error: 'No se pudo registrar el cliente.' });
      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'No se pudo registrar',
      );
    });
  });

  describe('initial values', () => {
    it('starts empty when registering', () => {
      const { component } = setup();
      expect(component.form.getRawValue()).toEqual({
        firstName: '',
        lastName: '',
        phone: '',
        email: '',
        identification: '',
        address: '',
      });
    });

    it('starts with the customer data when editing, with the optionals empty as ""', () => {
      const initial: CustomerInput = {
        firstName: 'Ana',
        lastName: 'Pérez',
        phone: '0987654321',
        email: null,
        identification: 'AB123',
        address: 'Calle 1',
      };
      const { component } = setup({ initial });
      expect(component.form.getRawValue()).toEqual({
        firstName: 'Ana',
        lastName: 'Pérez',
        phone: '0987654321',
        email: '',
        identification: 'AB123',
        address: 'Calle 1',
      });
    });
  });

  describe('phone warning', () => {
    const match = { id: 'c1', fullName: 'Luis Gómez', phone: '0987654321' };

    it('asks to check the phone when leaving a valid phone field', () => {
      const { component, phones } = setup();
      component.form.patchValue({ phone: ' 0987654321 ' });
      component.onPhoneFocusOut();
      expect(phones).toEqual(['0987654321']);
    });

    it('does not ask for an empty or invalid phone', () => {
      const { component, phones } = setup();
      component.onPhoneFocusOut();
      component.form.patchValue({ phone: 'abc' });
      component.onPhoneFocusOut();
      expect(phones).toEqual([]);
    });

    it('lists the customers that already use the phone, without blocking', () => {
      const { fixture, component, element } = setup();
      component.form.patchValue({ phone: '0987654321' });
      fixture.componentRef.setInput('phoneWarning', { phone: '0987654321', matches: [match] });
      fixture.detectChanges();

      expect(element.querySelector('[role="status"]')?.textContent).toContain('Luis Gómez');
      expect(element.textContent).toContain('puedes continuar');
      component.form.patchValue({ firstName: 'Ana', lastName: 'Pérez' });
      const submitted: unknown[] = [];
      component.submitted.subscribe((v) => submitted.push(v));
      component.onSubmit();
      expect(submitted).toHaveLength(1);
    });

    it('hides the warning as soon as the phone changes', () => {
      const { fixture, component, element } = setup();
      component.form.patchValue({ phone: '0987654321' });
      fixture.componentRef.setInput('phoneWarning', { phone: '0987654321', matches: [match] });
      fixture.detectChanges();
      expect(element.querySelector('[role="status"]')).not.toBeNull();

      component.form.patchValue({ phone: '0981112233' });
      fixture.detectChanges();
      expect(element.querySelector('[role="status"]')).toBeNull();
    });

    it('shows nothing when there are no other customers with that phone', () => {
      const { fixture, component, element } = setup();
      component.form.patchValue({ phone: '0987654321' });
      fixture.componentRef.setInput('phoneWarning', { phone: '0987654321', matches: [] });
      fixture.detectChanges();
      expect(element.querySelector('[role="status"]')).toBeNull();
    });
  });

  describe('identification conflict', () => {
    const existing = { id: 'c9', fullName: 'Luis Gómez', phone: '0990000001' };

    it('names the customer that already has the identification', () => {
      const { fixture, component, element } = setup();
      component.form.patchValue({ identification: 'ab123' });
      fixture.componentRef.setInput('identificationConflict', {
        identification: 'AB123',
        existing,
      });
      fixture.detectChanges();

      expect(component.fieldError('identification')).toBe(
        'Ya existe un cliente con esta identificación',
      );
      const alerts = Array.from(element.querySelectorAll('[role="alert"]')).map(
        (e) => e.textContent,
      );
      expect(alerts.some((text) => text?.includes('Luis Gómez'))).toBe(true);
      expect(element.textContent).toContain('0990000001');
    });

    it('still warns when the existing customer is unknown', () => {
      const { fixture, component, element } = setup();
      component.form.patchValue({ identification: 'AB123' });
      fixture.componentRef.setInput('identificationConflict', {
        identification: 'AB123',
        existing: null,
      });
      fixture.detectChanges();
      expect(element.textContent).toContain('ya pertenece a otro cliente del taller');
    });

    it('disappears once the identification is edited', () => {
      const { fixture, component, element } = setup();
      component.form.patchValue({ identification: 'AB123' });
      fixture.componentRef.setInput('identificationConflict', {
        identification: 'AB123',
        existing,
      });
      fixture.detectChanges();

      component.form.patchValue({ identification: 'AB124' });
      fixture.detectChanges();

      expect(component.fieldError('identification')).toBe('');
      expect(element.textContent).not.toContain('Luis Gómez');
    });
  });
});
