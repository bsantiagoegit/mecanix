import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { initialAuthState } from '@core/auth/store/auth.state';
import { initialWorkshopState } from '@core/workshops/store/workshop.state';
import { ToastService } from '@shared/services/toast.service';
import { provideTestStore } from '../../../../../testing/utils/store';
import { Customer, CustomerVehicle } from '../../models/customer.model';
import { CustomersService } from '../../services/customers.service';
import { CustomerDetailPage } from './customer-detail-page';

const full: Customer = {
  id: 'c1',
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '0991000001',
  email: 'ana@example.com',
  identification: '1710034065',
  address: 'Calle 1, Quito',
};

const nameOnly: Customer = {
  ...full,
  phone: null,
  email: null,
  identification: null,
  address: null,
};

const vehicle = (n: number, over: Partial<CustomerVehicle> = {}): CustomerVehicle => ({
  ownershipId: `o${n}`,
  vehicleId: `v${n}`,
  licensePlate: `PBA-000${n}`,
  make: 'Chevrolet',
  model: 'Spark',
  year: 2018,
  startedAt: '2026-03-01T15:00:00Z',
  endedAt: null,
  vehicleDeleted: false,
  ...over,
});

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
    role?: 'owner' | 'advisor' | 'mechanic';
    getById?: ReturnType<typeof vi.fn>;
    getNameById?: ReturnType<typeof vi.fn>;
    listVehicles?: ReturnType<typeof vi.fn>;
    id?: string;
    q?: string;
  } = {},
) {
  const getById = options.getById ?? vi.fn().mockResolvedValue(full);
  const getNameById = options.getNameById ?? vi.fn().mockResolvedValue(nameOnly);
  const listVehicles = options.listVehicles ?? vi.fn().mockResolvedValue([vehicle(1)]);
  const update = vi.fn().mockResolvedValue(full);
  TestBed.configureTestingModule({
    imports: [CustomerDetailPage],
    providers: [
      provideRouter([]),
      provideTestStore({
        auth: {
          ...initialAuthState,
          isAuthenticated: true,
          activeWorkshopId: 'w1',
          role: options.role ?? 'advisor',
        },
        workshops: { ...initialWorkshopState, active: { id: 'w1' } as never },
      }),
      {
        provide: CustomersService,
        useValue: { getById, getNameById, listVehicles, update, findByPhone: vi.fn() },
      },
    ],
  });
  const fixture = TestBed.createComponent(CustomerDetailPage);
  fixture.componentRef.setInput('id', options.id ?? 'c1');
  if (options.q !== undefined) fixture.componentRef.setInput('q', options.q);
  const flush = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  fixture.detectChanges();
  return {
    fixture,
    getById,
    getNameById,
    listVehicles,
    update,
    flush,
    toast: TestBed.inject(ToastService),
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('CustomerDetailPage', () => {
  describe('the customer', () => {
    it('shows a skeleton while it loads', () => {
      const pending = deferred<Customer>();
      const { element } = setup({ getById: vi.fn(() => pending.promise) });
      expect(element.querySelector('[role="status"]')?.textContent).toContain('Cargando cliente');
      expect(element.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
    });

    it('shows the name and the contact data to an advisor', async () => {
      const { flush, element, getById, getNameById } = setup();
      await flush();
      expect(getById).toHaveBeenCalledWith('c1');
      expect(getNameById).not.toHaveBeenCalled();
      expect(element.querySelector('h1')?.textContent).toContain('Ana Pérez');
      for (const text of ['0991000001', 'ana@example.com', '1710034065', 'Calle 1, Quito']) {
        expect(element.textContent).toContain(text);
      }
    });

    it('shows a dash for what an old customer does not have', async () => {
      const { flush, element } = setup({
        getById: vi.fn().mockResolvedValue({ ...full, email: null, address: null }),
      });
      await flush();
      const values = [...element.querySelectorAll('dd')].map((dd) => dd.textContent?.trim());
      expect(values).toEqual(['0991000001', '—', '1710034065', '—']);
    });

    it('shows only the name to a mechanic, with no contact section', async () => {
      const { flush, element, getById, getNameById } = setup({ role: 'mechanic' });
      await flush();
      expect(getNameById).toHaveBeenCalledWith('c1');
      expect(getById).not.toHaveBeenCalled();
      expect(element.querySelector('h1')?.textContent).toContain('Ana Pérez');
      expect(element.querySelector('dl')).toBeNull();
      expect(element.textContent).not.toContain('Datos de contacto');
    });

    it('says the customer was not found, with a way back', async () => {
      const { flush, element } = setup({ getById: vi.fn().mockResolvedValue(null), q: 'ana' });
      await flush();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'Cliente no encontrado',
      );
      expect(element.textContent).not.toContain('Datos de contacto');
      const back = element.querySelector<HTMLAnchorElement>('[role="alert"] a')!;
      expect(back.getAttribute('href')).toBe('/customers?q=ana');
    });

    it('shows an error with retry instead of "not found" when the request fails', async () => {
      const getById = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(full);
      const { flush, element, component } = setup({ getById });
      await flush();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'No se pudo cargar el cliente',
      );
      expect(element.textContent).not.toContain('no encontrado');

      component.retry();
      await flush();
      expect(element.querySelector('h1')?.textContent).toContain('Ana Pérez');
    });

    it('loads the other customer when the route changes', async () => {
      const { fixture, flush, getById, element } = setup();
      await flush();
      getById.mockResolvedValue({ ...full, id: 'c2', firstName: 'Luis', lastName: 'Gómez' });
      fixture.componentRef.setInput('id', 'c2');
      await flush();
      await flush();
      expect(getById).toHaveBeenLastCalledWith('c2');
      expect(element.querySelector('h1')?.textContent).toContain('Luis Gómez');
    });

    it('ignores the answer for a customer that was left behind', async () => {
      const slow = deferred<Customer>();
      const getById = vi
        .fn()
        .mockReturnValueOnce(slow.promise)
        .mockResolvedValue({ ...full, id: 'c2', firstName: 'Luis', lastName: 'Gómez' });
      const { fixture, flush, element } = setup({ getById });
      fixture.componentRef.setInput('id', 'c2');
      await flush();
      await flush();
      slow.resolve(full);
      await flush();
      expect(element.querySelector('h1')?.textContent).toContain('Luis Gómez');
    });
  });

  describe('going back', () => {
    it('returns to the list with the search it came from', async () => {
      const { flush, element } = setup({ q: 'ana' });
      await flush();
      expect(element.querySelector('a')?.getAttribute('href')).toBe('/customers?q=ana');
    });

    it('returns to the plain list when the router passes no search at all', async () => {
      const { fixture, flush, element } = setup();
      fixture.componentRef.setInput('q', undefined);
      await flush();
      expect(element.querySelector('a')?.getAttribute('href')).toBe('/customers');
    });

    it('returns to the plain list when there was no search', async () => {
      const { flush, element } = setup();
      await flush();
      expect(element.querySelector('a')?.getAttribute('href')).toBe('/customers');
    });
  });

  describe('vehicles', () => {
    it('shows the current vehicles with plate, make, model and year', async () => {
      const { flush, element } = setup();
      await flush();
      const list = element.querySelector('ul[aria-label="Vehículos actuales"]')!;
      expect(list.textContent).toContain('PBA-0001');
      expect(list.textContent).toContain('Chevrolet Spark');
      expect(list.textContent).toContain('2018');
    });

    it('shows the name before the vehicles arrive', async () => {
      const pending = deferred<CustomerVehicle[]>();
      const { flush, element } = setup({ listVehicles: vi.fn(() => pending.promise) });
      await flush();
      expect(element.querySelector('h1')?.textContent).toContain('Ana Pérez');
      expect(element.textContent).toContain('Cargando vehículos');
      expect(element.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
    });

    it('says the customer has no vehicles yet', async () => {
      const { flush, element } = setup({ listVehicles: vi.fn().mockResolvedValue([]) });
      await flush();
      expect(element.textContent).toContain('Aún no tiene vehículos');
      expect(element.textContent).not.toContain('Historial de vehículos');
    });

    it('only lists the ones that are theirs today as current', async () => {
      const { flush, element } = setup({
        listVehicles: vi
          .fn()
          .mockResolvedValue([vehicle(1), vehicle(2, { endedAt: '2026-06-01T15:00:00Z' })]),
      });
      await flush();
      const list = element.querySelector('ul[aria-label="Vehículos actuales"]')!;
      expect(list.textContent).toContain('PBA-0001');
      expect(list.textContent).not.toContain('PBA-0002');
    });

    it('says when none is current but there is a history', async () => {
      const { flush, element } = setup({
        listVehicles: vi.fn().mockResolvedValue([vehicle(2, { endedAt: '2026-06-01T15:00:00Z' })]),
      });
      await flush();
      expect(element.textContent).toContain('No tiene vehículos actuales');
    });

    it('shows an error for the vehicles without hiding the customer, and retries', async () => {
      const listVehicles = vi
        .fn()
        .mockRejectedValueOnce(new Error('x'))
        .mockResolvedValue([vehicle(1)]);
      const { flush, element, component } = setup({ listVehicles });
      await flush();
      expect(element.querySelector('h1')?.textContent).toContain('Ana Pérez');
      expect(element.textContent).toContain('No se pudieron cargar los vehículos');

      component.retryVehicles();
      await flush();
      expect(element.textContent).toContain('PBA-0001');
    });
  });

  describe('vehicle history', () => {
    const history = [
      vehicle(1),
      vehicle(2, { endedAt: '2026-06-01T15:00:00Z', startedAt: '2025-01-10T15:00:00Z' }),
      vehicle(3, { vehicleDeleted: true, endedAt: '2024-05-01T15:00:00Z' }),
    ];

    it('is closed until the button opens it, and closes again', async () => {
      const { flush, element, component } = setup({
        listVehicles: vi.fn().mockResolvedValue(history),
      });
      await flush();
      expect(element.querySelector('#vehicle-history')).toBeNull();

      component.toggleHistory();
      await flush();
      expect(element.querySelector('#vehicle-history')).not.toBeNull();

      component.toggleHistory();
      await flush();
      expect(element.querySelector('#vehicle-history')).toBeNull();
    });

    it('lists every vehicle with its period and whether it is current or past', async () => {
      const { flush, element, component } = setup({
        listVehicles: vi.fn().mockResolvedValue(history),
      });
      await flush();
      component.toggleHistory();
      await flush();

      const rows = [...element.querySelectorAll('#vehicle-history li')].map((li) =>
        li.textContent!.replace(/\s+/g, ' ').trim(),
      );
      expect(rows).toHaveLength(3);
      expect(rows[0]).toContain('PBA-0001');
      expect(rows[0]).toContain('Actual');
      expect(rows[1]).toContain('Anterior');
      expect(rows[1]).toContain('hasta');
      expect(rows[2]).toContain('Eliminado');
    });

    it('exposes its state to assistive technology', async () => {
      const { flush, element } = setup({ listVehicles: vi.fn().mockResolvedValue(history) });
      await flush();
      const toggle = [...element.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Historial de vehículos'),
      )!;
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      toggle.click();
      await flush();
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(toggle.getAttribute('aria-controls')).toBe('vehicle-history');
    });

    it('closes when another customer is opened', async () => {
      const { fixture, flush, element, component } = setup({
        listVehicles: vi.fn().mockResolvedValue(history),
      });
      await flush();
      component.toggleHistory();
      await flush();
      fixture.componentRef.setInput('id', 'c2');
      await flush();
      await flush();
      expect(element.querySelector('#vehicle-history')).toBeNull();
    });
  });

  describe('editing', () => {
    it('offers Editar to an owner and an advisor, and not to a mechanic', async () => {
      for (const role of ['owner', 'advisor', 'mechanic'] as const) {
        TestBed.resetTestingModule();
        const { flush, element } = setup({ role });
        await flush();
        const hasEdit = [...element.querySelectorAll('button')].some(
          (b) => b.textContent?.trim() === 'Editar',
        );
        expect(hasEdit).toBe(role !== 'mechanic');
        expect(element.querySelector('dialog')).toBe(
          role === 'mechanic' ? null : element.querySelector('dialog'),
        );
      }
    });

    it('edits in the same modal and refreshes the detail after saving', async () => {
      const { flush, element, component, getById, update, toast } = setup();
      const success = vi.spyOn(toast, 'success');
      await flush();

      await component.dialog.openEdit('c1');
      await flush();
      const dialog = element.querySelector('dialog')!;
      expect(dialog.open).toBe(true);
      expect(dialog.textContent).toContain('Editar cliente');

      getById.mockResolvedValue({ ...full, address: 'Calle 9, Quito' });
      await component.dialog.submit({
        firstName: 'Ana',
        lastName: 'Pérez',
        phone: '0991000001',
        email: 'ana@example.com',
        identification: '1710034065',
        address: 'Calle 9, Quito',
      });
      await flush();

      expect(update).toHaveBeenCalledWith(
        'w1',
        'c1',
        expect.objectContaining({ address: 'Calle 9, Quito' }),
      );
      expect(success).toHaveBeenCalledWith('Cambios guardados');
      expect(component.dialog.isOpen()).toBe(false);
      expect(element.textContent).toContain('Calle 9, Quito');
    });
  });
});
