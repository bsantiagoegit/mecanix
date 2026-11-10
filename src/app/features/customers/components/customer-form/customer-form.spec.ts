import { TestBed } from '@angular/core/testing';
import { CustomerInput } from '../../models/customer.model';
import { CustomerForm } from './customer-form';

const filled: CustomerInput = {
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '0987654321',
  email: 'ana@example.com',
  identification: '1710034065',
  address: 'Calle 1',
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

/** Escribe `value` en el campo y lo marca como tocado, para leer su mensaje de error. */
function typed(component: CustomerForm, field: string, value: string) {
  component.form.patchValue({ [field]: value });
  component.form.markAllAsTouched();
  return component.fieldError(field);
}

describe('CustomerForm', () => {
  describe('every field is required', () => {
    it('does not submit an empty form and marks all the fields', () => {
      const { component, submitted } = setup();
      component.onSubmit();
      expect(submitted).toEqual([]);
      for (const field of [
        'firstName',
        'lastName',
        'phone',
        'email',
        'identification',
        'address',
      ]) {
        expect(component.fieldError(field)).toBe('Este campo es obligatorio');
      }
    });

    it.each(['firstName', 'lastName', 'phone', 'email', 'identification', 'address'] as const)(
      'does not submit without %s',
      (field) => {
        const { component, submitted } = setup();
        component.form.setValue({ ...filled, [field]: '' });
        component.onSubmit();
        expect(submitted).toEqual([]);
        expect(component.fieldError(field)).toBe('Este campo es obligatorio');
      },
    );

    it('marks every field as required in the form', () => {
      const { element } = setup();
      expect(element.querySelectorAll('label .text-danger-500')).toHaveLength(6);
    });

    it('submits when everything is filled in correctly', () => {
      const { component, submitted } = setup();
      component.form.setValue(filled);
      component.onSubmit();
      expect(submitted).toEqual([filled]);
    });
  });

  describe('celular (Ecuador, 10 dígitos)', () => {
    it.each(['0987654321', '0991000001', '0900000000'])('accepts "%s"', (phone) => {
      const { component } = setup();
      expect(typed(component, 'phone', phone)).toBe('');
    });

    it.each([
      ['098765432', 'El celular debe tener 10 dígitos'],
      ['09876543210', 'El celular debe tener 10 dígitos'],
      ['0287654321', 'El celular debe empezar con 09'],
      ['1987654321', 'El celular debe empezar con 09'],
      ['098 765 4321', 'Escribe solo números, sin espacios ni guiones'],
      ['098-765-4321', 'Escribe solo números, sin espacios ni guiones'],
      ['+593987654321', 'Escribe solo números, sin espacios ni guiones'],
      ['09876abc21', 'Escribe solo números, sin espacios ni guiones'],
    ])('rejects "%s"', (phone, message) => {
      const { component } = setup();
      expect(typed(component, 'phone', phone)).toBe(message);
    });

    it('limits what can be typed to 10 characters and shows the numeric keyboard', () => {
      const { element } = setup();
      const phone = element.querySelector('input[type="tel"]') as HTMLInputElement;
      expect(phone.getAttribute('maxlength')).toBe('10');
      expect(phone.getAttribute('inputmode')).toBe('numeric');
    });
  });

  describe('cédula (Ecuador, Módulo 10)', () => {
    it.each(['1710034065', '1700000001', '0926687856', '3000000004'])('accepts "%s"', (id) => {
      const { component } = setup();
      expect(typed(component, 'identification', id)).toBe('');
    });

    it.each([
      ['171003406', 'La cédula debe tener 10 dígitos'],
      ['17100340655', 'La cédula debe tener 10 dígitos'],
      ['17100340a5', 'Escribe solo números'],
      ['1710-34065', 'Escribe solo números'],
      ['9910034065', 'Cédula inválida: los dos primeros dígitos no son una provincia'],
      ['1760034065', 'Cédula inválida: el tercer dígito debe ser de 0 a 5'],
      ['1710034066', 'Cédula inválida: el dígito verificador no coincide'],
    ])('rejects "%s"', (id, message) => {
      const { component } = setup();
      expect(typed(component, 'identification', id)).toBe(message);
    });

    it('does not submit an invalid cédula even if everything else is right', () => {
      const { component, submitted } = setup();
      component.form.setValue({ ...filled, identification: '1710034066' });
      component.onSubmit();
      expect(submitted).toEqual([]);
    });

    it('limits what can be typed to 10 characters and shows the numeric keyboard', () => {
      const { element } = setup();
      const field = Array.from(element.querySelectorAll('input')).find(
        (input) => input.getAttribute('maxlength') === '10' && input.type !== 'tel',
      ) as HTMLInputElement;
      expect(field.getAttribute('inputmode')).toBe('numeric');
    });
  });

  describe('email (el mismo validador global que el inicio de sesión)', () => {
    it('accepts a valid email', () => {
      const { component } = setup();
      expect(typed(component, 'email', 'ana@example.com')).toBe('');
    });

    it.each(['ana@example', 'ana', '@example.com', 'a na@example.com'])('rejects "%s"', (email) => {
      const { component } = setup();
      expect(typed(component, 'email', email)).toBe('Email inválido');
    });
  });

  describe('lengths', () => {
    it.each([
      ['firstName', 121],
      ['lastName', 121],
      ['address', 201],
    ])('rejects a %s that is too long', (field, length) => {
      const { component } = setup();
      expect(typed(component, field, 'a'.repeat(length))).toBe('Es demasiado largo');
    });

    it('rejects an email longer than 254 characters', () => {
      const { component } = setup();
      expect(typed(component, 'email', `${'a'.repeat(250)}@example.com`)).not.toBe('');
    });
  });

  it('strips surrounding spaces while typing', () => {
    const { component } = setup();
    component.form.controls.firstName.setValue('  Ana ');
    expect(component.form.controls.firstName.value).toBe('Ana');
  });

  describe('submitting', () => {
    it('emits the data without surrounding spaces', () => {
      const { component, submitted } = setup();
      component.form.setValue({ ...filled, address: '  Calle 1  ' });
      component.onSubmit();
      expect(submitted[0].address).toBe('Calle 1');
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

    it('starts with the customer data when editing', () => {
      const { component } = setup({ initial: filled });
      expect(component.form.getRawValue()).toEqual(filled);
    });
  });

  describe('phone warning', () => {
    const match = { id: 'c1', fullName: 'Luis Gómez', phone: '0987654321' };

    it('asks to check the phone when leaving a valid phone field', () => {
      const { component, phones } = setup();
      component.form.patchValue({ phone: '0987654321' });
      component.onPhoneFocusOut();
      expect(phones).toEqual(['0987654321']);
    });

    it.each(['', 'abc', '098765432', '0287654321'])('does not ask for the phone "%s"', (phone) => {
      const { component, phones } = setup();
      component.form.patchValue({ phone });
      component.onPhoneFocusOut();
      expect(phones).toEqual([]);
    });

    it('lists the customers that already use the phone, without blocking', () => {
      const { fixture, component, element } = setup();
      component.form.setValue(filled);
      fixture.componentRef.setInput('phoneWarning', { phone: '0987654321', matches: [match] });
      fixture.detectChanges();

      expect(element.querySelector('[role="status"]')?.textContent).toContain('Luis Gómez');
      expect(element.textContent).toContain('puedes continuar');
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

  describe('cédula conflict', () => {
    const existing = { id: 'c9', fullName: 'Luis Gómez', phone: '0990000001' };

    it('names the customer that already has the cédula', () => {
      const { fixture, component, element } = setup();
      component.form.patchValue({ identification: '1710034065' });
      fixture.componentRef.setInput('identificationConflict', {
        identification: '1710034065',
        existing,
      });
      fixture.detectChanges();

      expect(component.fieldError('identification')).toBe('Ya existe un cliente con esta cédula');
      const alerts = Array.from(element.querySelectorAll('[role="alert"]')).map(
        (e) => e.textContent,
      );
      expect(alerts.some((text) => text?.includes('Luis Gómez'))).toBe(true);
      expect(element.textContent).toContain('0990000001');
    });

    it('still warns when the existing customer is unknown', () => {
      const { fixture, component, element } = setup();
      component.form.patchValue({ identification: '1710034065' });
      fixture.componentRef.setInput('identificationConflict', {
        identification: '1710034065',
        existing: null,
      });
      fixture.detectChanges();
      expect(element.textContent).toContain('ya pertenece a otro cliente del taller');
    });

    it('disappears once the cédula is edited', () => {
      const { fixture, component, element } = setup();
      component.form.patchValue({ identification: '1710034065' });
      fixture.componentRef.setInput('identificationConflict', {
        identification: '1710034065',
        existing,
      });
      fixture.detectChanges();

      component.form.patchValue({ identification: '1713175071' });
      fixture.detectChanges();

      expect(component.fieldError('identification')).toBe('');
      expect(element.textContent).not.toContain('Luis Gómez');
    });
  });
});
