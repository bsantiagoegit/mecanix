import { TestBed } from '@angular/core/testing';
import { ToastService } from '@shared/services/toast.service';
import { initialAuthState } from '@core/auth/store/auth.state';
import { initialWorkshopState } from '@core/workshops/store/workshop.state';

import { provideTestStore } from '../../../../../testing/utils/store';
import { Customer, CustomerPage, CustomerSummary } from '../../models/customer.model';
import { DuplicateIdentificationError } from '../../models/duplicate-identification.error';
import { CustomersService } from '../../services/customers.service';
import { CustomerListPage } from './customer-list-page';

const customer = (n: number, over: Partial<CustomerSummary> = {}): CustomerSummary => ({
  id: `c${n}`,
  firstName: `Nombre${n}`,
  lastName: `Apellido${n}`,
  phone: `099000000${n}`,
  email: null,
  identification: null,
  ...over,
});

const saved: Customer = { ...customer(99), address: null };

const input = {
  firstName: 'Luisa',
  lastName: 'Gómez',
  phone: '0981112233',
  email: 'luisa@example.com',
  identification: '1713175071',
  address: 'Calle 2',
};

const page = (n: number, hasMore = false): CustomerPage => ({
  items: Array.from({ length: n }, (_, i) => customer(i + 1)),
  hasMore,
});

/** Promesa que se resuelve a mano, para controlar el orden de las respuestas. */
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
    search?: ReturnType<typeof vi.fn>;
    create?: ReturnType<typeof vi.fn>;
    findByPhone?: ReturnType<typeof vi.fn>;
    active?: boolean;
  } = {},
) {
  const search = options.search ?? vi.fn().mockResolvedValue(page(2));
  const create = options.create ?? vi.fn().mockResolvedValue(saved);
  const findByPhone = options.findByPhone ?? vi.fn().mockResolvedValue([]);
  TestBed.configureTestingModule({
    imports: [CustomerListPage],
    providers: [
      provideTestStore({
        auth: {
          ...initialAuthState,
          isAuthenticated: true,
          activeWorkshopId: 'w1',
          role: options.role ?? 'advisor',
        },
        workshops: {
          ...initialWorkshopState,
          active: options.active === false ? null : ({ id: 'w1' } as never),
        },
      }),
      { provide: CustomersService, useValue: { search, create, findByPhone } },
    ],
  });
  const fixture = TestBed.createComponent(CustomerListPage);
  const flush = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  fixture.detectChanges();
  return {
    fixture,
    search,
    create,
    findByPhone,
    toast: TestBed.inject(ToastService),
    flush,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('CustomerListPage', () => {
  it('lists the customers of the active workshop on load', async () => {
    const { search, flush, element } = setup();
    await flush();

    expect(search).toHaveBeenCalledWith('w1', '');
    expect(element.textContent).toContain('Nombre1 Apellido1');
    expect(element.textContent).toContain('Nombre2 Apellido2');
  });

  it('shows a loading message while the first page loads', () => {
    const pending = deferred<CustomerPage>();
    const { element } = setup({ search: vi.fn(() => pending.promise) });
    expect(element.textContent).toContain('Cargando clientes');
  });

  it('does not load anything until there is an active workshop', () => {
    const { search } = setup({ active: false });
    expect(search).not.toHaveBeenCalled();
  });

  describe('search', () => {
    it('searches with the text and shows the results', async () => {
      const search = vi
        .fn()
        .mockResolvedValueOnce(page(2))
        .mockResolvedValueOnce({ items: [customer(7)], hasMore: false });
      const { component, flush, element } = setup({ search });
      await flush();

      component.onSearch('ana');
      await flush();

      expect(search).toHaveBeenLastCalledWith('w1', 'ana');
      expect(element.textContent).toContain('Nombre7 Apellido7');
      expect(element.textContent).not.toContain('Nombre1 Apellido1');
    });

    it('does not search again for the same text', async () => {
      const { component, flush, search } = setup();
      await flush();
      component.onSearch('');
      expect(search).toHaveBeenCalledTimes(1);

      component.onSearch('ana');
      component.onSearch('ana');
      expect(search).toHaveBeenCalledTimes(2);
    });

    it('explains when nothing matches the text', async () => {
      const search = vi
        .fn()
        .mockResolvedValueOnce(page(2))
        .mockResolvedValueOnce({ items: [], hasMore: false });
      const { component, flush, element } = setup({ search });
      await flush();

      component.onSearch('zzz');
      await flush();

      expect(element.textContent).toContain('No se encontraron clientes para «zzz»');
    });

    it('explains when the workshop has no customers yet', async () => {
      const { flush, element } = setup({
        search: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
      });
      await flush();
      expect(element.textContent).toContain('Aún no hay clientes en tu taller');
    });

    it('ignores the answer of a search that was overtaken by a newer one', async () => {
      const slow = deferred<CustomerPage>();
      const fast = deferred<CustomerPage>();
      const search = vi
        .fn()
        .mockResolvedValueOnce(page(1))
        .mockReturnValueOnce(slow.promise)
        .mockReturnValueOnce(fast.promise);
      const { component, flush } = setup({ search });
      await flush();

      component.onSearch('a');
      component.onSearch('ab');
      fast.resolve({ items: [customer(2)], hasMore: false });
      await flush();
      slow.resolve({ items: [customer(9)], hasMore: true });
      await flush();

      expect(component.items().map((c) => c.id)).toEqual(['c2']);
      expect(component.hasMore()).toBe(false);
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('pagination', () => {
    it('shows "Cargar más" only when there are more pages', async () => {
      const { flush, element } = setup({ search: vi.fn().mockResolvedValue(page(2, true)) });
      await flush();
      expect(element.textContent).toContain('Cargar más');
    });

    it('hides "Cargar más" on the last page', async () => {
      const { flush, element } = setup();
      await flush();
      expect(element.textContent).not.toContain('Cargar más');
    });

    it('appends the next page asking from the current offset', async () => {
      const search = vi
        .fn()
        .mockResolvedValueOnce({ items: [customer(1), customer(2)], hasMore: true })
        .mockResolvedValueOnce({ items: [customer(3)], hasMore: false });
      const { component, flush, element } = setup({ search });
      await flush();

      await component.loadMore();
      await flush();

      expect(search).toHaveBeenLastCalledWith('w1', '', 2);
      expect(component.items().map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
      expect(element.textContent).not.toContain('Cargar más');
    });

    it('keeps the loaded customers and offers a retry when loading more fails', async () => {
      const search = vi
        .fn()
        .mockResolvedValueOnce(page(2, true))
        .mockRejectedValueOnce(new Error('x'));
      const { component, flush, element } = setup({ search });
      await flush();

      await component.loadMore();
      await flush();

      expect(component.items()).toHaveLength(2);
      expect(component.moreError()).toContain('No se pudieron cargar más');
      expect(element.textContent).toContain('Cargar más');
    });

    it('does not load twice at once', async () => {
      const next = deferred<CustomerPage>();
      const search = vi.fn().mockResolvedValueOnce(page(2, true)).mockReturnValueOnce(next.promise);
      const { component, flush } = setup({ search });
      await flush();

      void component.loadMore();
      void component.loadMore();
      expect(search).toHaveBeenCalledTimes(2);

      next.resolve(page(1));
      await flush();
    });

    it('drops a "load more" answer that arrives after a new search', async () => {
      const more = deferred<CustomerPage>();
      const search = vi
        .fn()
        .mockResolvedValueOnce(page(2, true))
        .mockReturnValueOnce(more.promise)
        .mockResolvedValueOnce({ items: [customer(8)], hasMore: false });
      const { component, flush } = setup({ search });
      await flush();

      void component.loadMore();
      component.onSearch('x');
      await flush();
      more.resolve({ items: [customer(5)], hasMore: true });
      await flush();

      expect(component.items().map((c) => c.id)).toEqual(['c8']);
      expect(component.hasMore()).toBe(false);
    });
  });

  describe('errors', () => {
    it('shows an error with a retry, never an empty list, when the load fails', async () => {
      const search = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(page(2));
      const { component, flush, element } = setup({ search });
      await flush();

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'No se pudieron cargar los clientes',
      );
      expect(element.textContent).not.toContain('Aún no hay clientes');
      expect(element.textContent).toContain('Reintentar');

      component.retry();
      await flush();
      expect(element.textContent).toContain('Nombre1 Apellido1');
      expect(element.querySelector('[role="alert"]')).toBeNull();
    });
  });

  describe('roles', () => {
    it.each(['owner', 'advisor'] as const)(
      '%s searches by name, phone and identification',
      async (role) => {
        const { component, flush, element } = setup({ role });
        await flush();
        expect(component.byNameOnly()).toBe(false);
        expect(component.placeholder()).toBe('Nombre, celular o cédula');
        expect(element.textContent).not.toContain('solo por nombre');
      },
    );

    it('the mechanic searches only by name and is told so', async () => {
      const { component, flush, element } = setup({ role: 'mechanic' });
      await flush();
      expect(component.byNameOnly()).toBe(true);
      expect(component.placeholder()).toBe('Nombre o apellido');
      expect(element.textContent).toContain('la búsqueda es solo por nombre');
    });

    it('the mechanic sees names without phone', async () => {
      const search = vi.fn().mockResolvedValue({
        items: [customer(1, { phone: null, identification: null })],
        hasMore: false,
      });
      const { flush, element } = setup({ role: 'mechanic', search });
      await flush();
      expect(element.textContent).toContain('Nombre1 Apellido1');
      expect(element.textContent).not.toContain('0990000001');
    });
  });

  describe('registering customers in a modal', () => {
    const dialog = (element: HTMLElement) => element.querySelector('dialog') as HTMLDialogElement;

    it.each(['owner', 'advisor'] as const)(
      '%s opens the modal with the "Nuevo cliente" button',
      async (role) => {
        const { component, flush, element } = setup({ role });
        await flush();
        expect(dialog(element).open).toBe(false);
        expect(element.querySelector('app-customer-form')).toBeNull();

        component.openCreate();
        await flush();

        expect(component.createOpen()).toBe(true);
        expect(dialog(element).open).toBe(true);
        expect(dialog(element).querySelector('h2')?.textContent).toContain('Nuevo cliente');
        expect(element.querySelector('app-customer-form')).not.toBeNull();
      },
    );

    it('has the button at the top and nothing to register inside the list', async () => {
      const { flush, element } = setup({
        search: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
      });
      await flush();
      const buttons = Array.from(element.querySelectorAll('button')).map((b) =>
        b.textContent?.trim(),
      );
      expect(buttons).toContain('Nuevo cliente');
      expect(element.textContent).not.toContain('Registrar nuevo cliente');
      expect(element.querySelector('ul')?.textContent).not.toContain('Nuevo cliente');
    });

    it('the mechanic has neither the button nor the modal', async () => {
      const { component, flush, element } = setup({ role: 'mechanic' });
      await flush();
      expect(component.canCreate()).toBe(false);
      expect(element.querySelector('dialog')).toBeNull();
      expect(element.textContent).not.toContain('Nuevo cliente');
    });

    it('registers the customer, closes the modal, thanks the user and refreshes the list', async () => {
      const { component, flush, create, search, toast, element } = setup();
      await flush();
      const success = vi.spyOn(toast, 'success');
      component.openCreate();
      await flush();

      await component.onCreate(input);
      await flush();

      expect(create).toHaveBeenCalledWith('w1', input);
      expect(success).toHaveBeenCalledWith('Cliente registrado');
      expect(component.createOpen()).toBe(false);
      expect(dialog(element).open).toBe(false);
      expect(search).toHaveBeenCalledTimes(2);
    });

    it('does not register without an active workshop', async () => {
      const { component, create } = setup({ active: false });
      await component.onCreate(input);
      expect(create).not.toHaveBeenCalled();
    });

    it('keeps the modal open and names the customer when the identification is taken', async () => {
      const existing = { id: 'c9', fullName: 'Luis Gómez', phone: '0990000001' };
      const { component, flush, element } = setup({
        create: vi.fn().mockRejectedValue(new DuplicateIdentificationError('1713175071', existing)),
      });
      await flush();
      component.openCreate();
      await flush();

      await component.onCreate(input);
      await flush();

      expect(component.createOpen()).toBe(true);
      expect(component.form.conflict()).toEqual({ identification: '1713175071', existing });
      expect(dialog(element).open).toBe(true);
    });

    it('keeps the modal open with an error when saving fails, and the list is not refreshed', async () => {
      const { component, flush, search } = setup({
        create: vi.fn().mockRejectedValue(new Error('network')),
      });
      await flush();
      component.openCreate();
      await flush();

      await component.onCreate(input);

      expect(component.createOpen()).toBe(true);
      expect(component.form.error()).toContain('No se pudo registrar el cliente');
      expect(search).toHaveBeenCalledTimes(1);
    });

    it('closes with "Cancelar" without saving anything', async () => {
      const { component, flush, create, element } = setup();
      await flush();
      component.openCreate();
      await flush();

      const cancel = Array.from(element.querySelectorAll('dialog button')).find((b) =>
        b.textContent?.includes('Cancelar'),
      ) as HTMLButtonElement;
      cancel.click();
      await flush();

      expect(component.createOpen()).toBe(false);
      expect(create).not.toHaveBeenCalled();
    });

    it('closing with the modal X or Esc also closes it', async () => {
      const { component, flush, element } = setup();
      await flush();
      component.openCreate();
      await flush();

      dialog(element).close();
      await flush();

      expect(component.createOpen()).toBe(false);
    });

    it('opens a clean form every time', async () => {
      const { component, flush } = setup({
        create: vi.fn().mockRejectedValue(new Error('network')),
      });
      await flush();
      component.openCreate();
      await component.onCreate(input);
      expect(component.form.error()).not.toBeNull();

      component.closeCreate();
      component.openCreate();

      expect(component.form.error()).toBeNull();
      expect(component.form.conflict()).toBeNull();
    });

    it('warns about a repeated phone when leaving the field, without blocking', async () => {
      const match = { id: 'c2', fullName: 'Luis Gómez', phone: '0981112233' };
      const { component, flush, findByPhone } = setup({
        findByPhone: vi.fn().mockResolvedValue([match]),
      });
      await flush();
      component.openCreate();

      await component.onPhoneChecked('0981112233');

      expect(findByPhone).toHaveBeenCalledWith('w1', '0981112233', undefined);
      expect(component.form.phoneWarning()).toEqual({ phone: '0981112233', matches: [match] });
    });
  });
});
