import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { NotFoundError } from '@core/errors';
import { initialWorkshopState } from '@core/workshops/store/workshop.state';
import { ToastService } from '@shared/services/toast.service';
import { provideTestStore } from '../../../../../testing/utils/store';
import { Customer, CustomerInput } from '../../models/customer.model';
import { DuplicateIdentificationError } from '../../models/duplicate-identification.error';
import { CustomersService } from '../../services/customers.service';
import { CustomerEditPage } from './customer-edit-page';

const customer: Customer = {
  id: 'c1',
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '0987654321',
  email: null,
  identification: 'AB123',
  address: null,
};

const changed: CustomerInput = {
  firstName: 'Luisa',
  lastName: 'Gómez',
  phone: '0981112233',
  email: null,
  identification: null,
  address: null,
};

function setup(
  options: {
    service?: Partial<Record<keyof CustomersService, ReturnType<typeof vi.fn>>>;
    active?: boolean;
  } = {},
) {
  const service = {
    getById: vi.fn().mockResolvedValue(customer),
    update: vi.fn().mockResolvedValue(customer),
    findByPhone: vi.fn().mockResolvedValue([]),
    ...options.service,
  };
  TestBed.configureTestingModule({
    imports: [CustomerEditPage],
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
  const fixture = TestBed.createComponent(CustomerEditPage);
  fixture.componentRef.setInput('id', 'c1');
  fixture.detectChanges();
  const flush = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return {
    fixture,
    service,
    navigate,
    flush,
    toast: TestBed.inject(ToastService),
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('CustomerEditPage', () => {
  it('loads the customer and shows the form titled "Editar cliente"', async () => {
    const { flush, service, component, element } = setup();
    await flush();
    expect(service.getById).toHaveBeenCalledWith('c1');
    expect(component.state()).toBe('ready');
    expect(component.initial()).toMatchObject({ firstName: 'Ana', phone: '0987654321' });
    expect(element.textContent).toContain('Editar cliente');
    expect(element.querySelector('app-customer-form')).not.toBeNull();
  });

  it('waits for the active workshop before loading', () => {
    const { service } = setup({ active: false });
    expect(service.getById).not.toHaveBeenCalled();
  });

  it('shows "not found" when the customer does not exist or is not visible', async () => {
    const { flush, component, element } = setup({
      service: { getById: vi.fn().mockResolvedValue(null) },
    });
    await flush();
    expect(component.state()).toBe('not-found');
    expect(element.textContent).toContain('Cliente no encontrado');
    expect(element.querySelector('app-customer-form')).toBeNull();
  });

  it('shows an error with a retry when the customer cannot be loaded', async () => {
    const getById = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(customer);
    const { flush, component, element } = setup({ service: { getById } });
    await flush();
    expect(component.state()).toBe('error');
    expect(element.textContent).toContain('Reintentar');

    component.retry();
    await flush();
    expect(component.state()).toBe('ready');
  });

  describe('saving', () => {
    it('updates the customer, thanks the user and goes back to the list', async () => {
      const { flush, component, service, toast, navigate } = setup();
      await flush();
      const success = vi.spyOn(toast, 'success');

      await component.onSubmit(changed);

      expect(service.update).toHaveBeenCalledWith('w1', 'c1', changed);
      expect(success).toHaveBeenCalledWith('Cambios guardados');
      expect(navigate).toHaveBeenCalledWith('/customers');
    });

    it('does not call the server when nothing changed', async () => {
      const { flush, component, service, toast, navigate } = setup();
      await flush();
      const info = vi.spyOn(toast, 'info');

      await component.onSubmit({ ...component.initial()! });

      expect(service.update).not.toHaveBeenCalled();
      expect(info).toHaveBeenCalledWith('No hay cambios que guardar');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not save without an active workshop', async () => {
      const { component, service } = setup({ active: false });
      await component.onSubmit(changed);
      expect(service.update).not.toHaveBeenCalled();
    });

    it('switches to "not found" when the customer disappeared while editing', async () => {
      const { flush, component, navigate } = setup({
        service: { update: vi.fn().mockRejectedValue(new NotFoundError('customer', 'c1')) },
      });
      await flush();
      await component.onSubmit(changed);
      expect(component.state()).toBe('not-found');
      expect(navigate).not.toHaveBeenCalled();
    });

    it('blocks a taken identification', async () => {
      const { flush, component, navigate } = setup({
        service: {
          update: vi.fn().mockRejectedValue(new DuplicateIdentificationError('ZZ9', null)),
        },
      });
      await flush();
      await component.onSubmit({ ...changed, identification: 'ZZ9' });
      expect(component.form.conflict()).toEqual({ identification: 'ZZ9', existing: null });
      expect(navigate).not.toHaveBeenCalled();
    });

    it('keeps what was typed and shows an error when saving fails', async () => {
      const { flush, component, navigate } = setup({
        service: { update: vi.fn().mockRejectedValue(new Error('network')) },
      });
      await flush();
      await component.onSubmit(changed);
      expect(component.form.error()).toContain('No se pudieron guardar los cambios');
      expect(component.state()).toBe('ready');
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('repeated phone warning', () => {
    it('does not count the customer being edited', async () => {
      const { flush, component, service } = setup();
      await flush();
      await component.onPhoneChecked('0981112233');
      expect(service.findByPhone).toHaveBeenCalledWith('w1', '0981112233', 'c1');
    });

    it('does not check the phone the customer already had', async () => {
      const { flush, component, service } = setup();
      await flush();
      await component.onPhoneChecked('0987654321');
      expect(service.findByPhone).not.toHaveBeenCalled();
      expect(component.form.phoneWarning()).toBeNull();
    });

    it('warns about the other customers that use the phone', async () => {
      const match = { id: 'c2', fullName: 'Luis Gómez', phone: '0981112233' };
      const { flush, component } = setup({
        service: { findByPhone: vi.fn().mockResolvedValue([match]) },
      });
      await flush();
      await component.onPhoneChecked('0981112233');
      expect(component.form.phoneWarning()).toEqual({ phone: '0981112233', matches: [match] });
    });
  });
});
