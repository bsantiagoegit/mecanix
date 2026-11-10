import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NotFoundError } from '@core/errors';
import { initialWorkshopState } from '@core/workshops/store/workshop.state';
import { ToastService } from '@shared/services/toast.service';
import { Subject } from 'rxjs';
import { provideTestStore } from '../../../../../testing/utils/store';
import { Customer, CustomerInput } from '../../models/customer.model';
import { DuplicateIdentificationError } from '../../models/duplicate-identification.error';
import { CustomersService } from '../../services/customers.service';
import { CustomerFormPage } from './customer-form-page';

const customer: Customer = {
  id: 'c1',
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '0987654321',
  email: null,
  identification: 'AB123',
  address: null,
};

const input: CustomerInput = {
  firstName: 'Luisa',
  lastName: 'Gómez',
  phone: '0981112233',
  email: null,
  identification: null,
  address: null,
};

function deferred<T>() {
  const control = {} as { resolve: (v: T) => void; reject: (e: unknown) => void };
  const promise = new Promise<T>((resolve, reject) => {
    control.resolve = resolve;
    control.reject = reject;
  });
  return { promise, ...control };
}

function setup(
  options: {
    inputs?: Record<string, unknown>;
    service?: Partial<Record<keyof CustomersService, ReturnType<typeof vi.fn>>>;
    active?: boolean;
  } = {},
) {
  const service = {
    getById: vi.fn().mockResolvedValue(customer),
    create: vi.fn().mockResolvedValue(customer),
    update: vi.fn().mockResolvedValue(customer),
    findByPhone: vi.fn().mockResolvedValue([]),
    ...options.service,
  };
  TestBed.configureTestingModule({
    imports: [CustomerFormPage],
    providers: [
      provideRouter([]),
      provideTestStore({
        workshops: {
          ...initialWorkshopState,
          active: options.active === false ? null : ({ id: 'w1' } as never),
        },
      }),
      { provide: CustomersService, useValue: service },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const toast = TestBed.inject(ToastService);
  const fixture = TestBed.createComponent(CustomerFormPage);
  for (const [name, value] of Object.entries(options.inputs ?? {})) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  const flush = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return {
    fixture,
    service,
    navigate,
    toast,
    flush,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('CustomerFormPage', () => {
  describe('registering', () => {
    it('shows an empty form titled "Nuevo cliente"', async () => {
      const { flush, element, service } = setup();
      await flush();
      expect(element.textContent).toContain('Nuevo cliente');
      expect(element.querySelector('app-customer-form')).not.toBeNull();
      expect(service.getById).not.toHaveBeenCalled();
    });

    it('starts with the values suggested by the URL', async () => {
      const { flush, element } = setup({ inputs: { firstName: 'Ana', phone: '0987654321' } });
      await flush();
      const values = Array.from(element.querySelectorAll('input')).map((i) => i.value);
      expect(values).toContain('Ana');
      expect(values).toContain('0987654321');
    });

    it('creates the customer, thanks the user and goes back to the list', async () => {
      const { component, service, toast, navigate } = setup();
      const success = vi.spyOn(toast, 'success');

      await component.onSubmit(input);

      expect(service.create).toHaveBeenCalledWith('w1', input);
      expect(success).toHaveBeenCalledWith('Cliente registrado');
      expect(navigate).toHaveBeenCalledWith('/customers');
    });

    it('shows the loading state while it saves', () => {
      const pending = deferred<Customer>();
      const { component } = setup({ service: { create: vi.fn(() => pending.promise) } });
      void component.onSubmit(input);
      expect(component.isSubmitting()).toBe(true);
    });

    it('does not save without an active workshop', async () => {
      const { component, service } = setup({ active: false });
      await component.onSubmit(input);
      expect(service.create).not.toHaveBeenCalled();
    });

    it('blocks a taken identification and names the customer that has it', async () => {
      const existing = { id: 'c9', fullName: 'Luis Gómez', phone: '0990000001' };
      const { component, fixture, navigate, element } = setup({
        service: {
          create: vi.fn().mockRejectedValue(new DuplicateIdentificationError('AB123', existing)),
        },
      });
      fixture.detectChanges();
      const form = element.querySelector('app-customer-form')!;
      expect(form).not.toBeNull();

      await component.onSubmit({ ...input, identification: 'AB123' });

      expect(component.conflict()).toEqual({ identification: 'AB123', existing });
      expect(navigate).not.toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
      expect(component.error()).toBeNull();
    });

    it('keeps what was typed and shows an error when saving fails', async () => {
      const { component, navigate } = setup({
        service: { create: vi.fn().mockRejectedValue(new Error('network')) },
      });
      await component.onSubmit(input);
      expect(component.error()).toContain('No se pudo registrar el cliente');
      expect(navigate).not.toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
    });
  });

  describe('editing', () => {
    const edit = { inputs: { id: 'c1' } };

    it('loads the customer and shows the form titled "Editar cliente"', async () => {
      const { flush, service, component, element } = setup(edit);
      await flush();
      expect(service.getById).toHaveBeenCalledWith('c1');
      expect(component.state()).toBe('ready');
      expect(component.initial()).toMatchObject({ firstName: 'Ana', phone: '0987654321' });
      expect(element.textContent).toContain('Editar cliente');
    });

    it('waits for the active workshop before loading', () => {
      const { service } = setup({ ...edit, active: false });
      expect(service.getById).not.toHaveBeenCalled();
    });

    it('shows "not found" when the customer does not exist or is not visible', async () => {
      const { flush, component, element } = setup({
        ...edit,
        service: { getById: vi.fn().mockResolvedValue(null) },
      });
      await flush();
      expect(component.state()).toBe('not-found');
      expect(element.textContent).toContain('Cliente no encontrado');
      expect(element.querySelector('app-customer-form')).toBeNull();
    });

    it('shows an error with a retry when the customer cannot be loaded', async () => {
      const getById = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(customer);
      const { flush, component, element } = setup({ ...edit, service: { getById } });
      await flush();
      expect(component.state()).toBe('error');
      expect(element.textContent).toContain('Reintentar');

      component.retry();
      await flush();
      expect(component.state()).toBe('ready');
    });

    it('updates the customer, thanks the user and goes back to the list', async () => {
      const { flush, component, service, toast, navigate } = setup(edit);
      await flush();
      const success = vi.spyOn(toast, 'success');

      await component.onSubmit({ ...input });

      expect(service.update).toHaveBeenCalledWith('w1', 'c1', input);
      expect(success).toHaveBeenCalledWith('Cambios guardados');
      expect(navigate).toHaveBeenCalledWith('/customers');
    });

    it('does not call the server when nothing changed', async () => {
      const { flush, component, service, toast, navigate } = setup(edit);
      await flush();
      const info = vi.spyOn(toast, 'info');

      await component.onSubmit({ ...component.initial()! });

      expect(service.update).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledWith('No hay cambios que guardar');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('switches to "not found" when the customer disappeared while editing', async () => {
      const { flush, component } = setup({
        ...edit,
        service: { update: vi.fn().mockRejectedValue(new NotFoundError('customer', 'c1')) },
      });
      await flush();
      await component.onSubmit({ ...input });
      expect(component.state()).toBe('not-found');
    });

    it('blocks a taken identification when editing too', async () => {
      const { flush, component } = setup({
        ...edit,
        service: {
          update: vi.fn().mockRejectedValue(new DuplicateIdentificationError('ZZ9', null)),
        },
      });
      await flush();
      await component.onSubmit({ ...input, identification: 'ZZ9' });
      expect(component.conflict()).toEqual({ identification: 'ZZ9', existing: null });
    });

    it('keeps what was typed and shows an error when saving fails', async () => {
      const { flush, component } = setup({
        ...edit,
        service: { update: vi.fn().mockRejectedValue(new Error('network')) },
      });
      await flush();
      await component.onSubmit({ ...input });
      expect(component.error()).toContain('No se pudieron guardar los cambios');
      expect(component.state()).toBe('ready');
    });
  });

  describe('repeated phone warning', () => {
    const match = { id: 'c2', fullName: 'Luis Gómez', phone: '0981112233' };

    it('warns about the customers that already use the phone', async () => {
      const { component, service } = setup({
        service: { findByPhone: vi.fn().mockResolvedValue([match]) },
      });

      await component.onPhoneChecked('0981112233');

      expect(service.findByPhone).toHaveBeenCalledWith('w1', '0981112233', undefined);
      expect(component.phoneWarning()).toEqual({ phone: '0981112233', matches: [match] });
    });

    it('does not count the customer being edited', async () => {
      const { flush, component, service } = setup({ inputs: { id: 'c1' } });
      await flush();
      await component.onPhoneChecked('0981112233');
      expect(service.findByPhone).toHaveBeenCalledWith('w1', '0981112233', 'c1');
    });

    it('does not check the phone the customer already had', async () => {
      const { flush, component, service } = setup({ inputs: { id: 'c1' } });
      await flush();
      await component.onPhoneChecked('0987654321');
      expect(service.findByPhone).not.toHaveBeenCalled();
      expect(component.phoneWarning()).toBeNull();
    });

    it('ignores the answer of a check that was overtaken', async () => {
      const slow = deferred<unknown[]>();
      const findByPhone = vi.fn().mockReturnValueOnce(slow.promise).mockResolvedValueOnce([]);
      const { component } = setup({ service: { findByPhone } });

      const first = component.onPhoneChecked('0981112233');
      await component.onPhoneChecked('0984445566');
      slow.resolve([match]);
      await first;

      expect(component.phoneWarning()).toEqual({ phone: '0984445566', matches: [] });
    });

    it('lets the user continue when the check fails', async () => {
      const { component } = setup({
        service: { findByPhone: vi.fn().mockRejectedValue(new Error('x')) },
      });
      await component.onPhoneChecked('0981112233');
      expect(component.phoneWarning()).toBeNull();
      expect(component.error()).toBeNull();
    });
  });
});
