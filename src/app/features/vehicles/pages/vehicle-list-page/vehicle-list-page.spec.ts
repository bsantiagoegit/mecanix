import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { initialAuthState } from '@core/auth/store/auth.state';
import { initialWorkshopState } from '@core/workshops/store/workshop.state';
import { provideTestStore } from '../../../../../testing/utils/store';
import { VehiclePage, VehicleSummary } from '../../models/vehicle.model';
import { VehiclesService } from '../../services/vehicles.service';
import { VehicleListPage } from './vehicle-list-page';

const vehicle = (n: number, over: Partial<VehicleSummary> = {}): VehicleSummary => ({
  id: `v${n}`,
  licensePlate: `PBA-000${n}`,
  make: 'Chevrolet',
  model: `Modelo${n}`,
  year: 2018,
  vin: null,
  hasKey: true,
  keyCode: '4821',
  owner: { id: `c${n}`, firstName: `Nombre${n}`, lastName: `Apellido${n}` },
  ...over,
});

const page = (n: number, hasMore = false): VehiclePage => ({
  items: Array.from({ length: n }, (_, i) => vehicle(i + 1)),
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
    active?: boolean;
    q?: string;
  } = {},
) {
  const search = options.search ?? vi.fn().mockResolvedValue(page(2));
  TestBed.configureTestingModule({
    imports: [VehicleListPage],
    providers: [
      provideRouter([]),
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
      { provide: VehiclesService, useValue: { search } },
    ],
  });
  const fixture = TestBed.createComponent(VehicleListPage);
  if (options.q !== undefined) fixture.componentRef.setInput('q', options.q);
  const flush = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  fixture.detectChanges();
  return {
    fixture,
    search,
    flush,
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('VehicleListPage', () => {
  it('lists the vehicles of the active workshop on load', async () => {
    const { search, flush, element } = setup();
    await flush();

    expect(search).toHaveBeenCalledWith('w1', '');
    expect(element.textContent).toContain('PBA-0001');
    expect(element.textContent).toContain('PBA-0002');
    expect(element.textContent).toContain('Nombre1 Apellido1');
  });

  it('shows a skeleton while the first page loads', () => {
    const pending = deferred<VehiclePage>();
    const { element } = setup({ search: vi.fn(() => pending.promise) });
    expect(element.querySelector('[role="status"]')?.textContent).toContain('Cargando vehículos');
    expect(element.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
    expect(element.querySelector('.animate-spin')).toBeNull();
  });

  it('does not load anything until there is an active workshop', () => {
    const { search } = setup({ active: false });
    expect(search).not.toHaveBeenCalled();
  });

  it('asks the user to search by plate or VIN', async () => {
    const { flush, element } = setup();
    await flush();
    expect(element.querySelector('input')?.placeholder).toBe('Placa o VIN');
    expect(element.querySelector('label')?.textContent).toContain('Buscar vehículo');
  });

  it('shows the key of each vehicle hidden', async () => {
    const { flush, element } = setup();
    await flush();
    expect(element.textContent).toContain('•••••');
    expect(element.textContent).not.toContain('4821');
  });

  describe('search', () => {
    it('searches with the text and shows the results', async () => {
      const search = vi
        .fn()
        .mockResolvedValueOnce(page(2))
        .mockResolvedValueOnce({ items: [vehicle(7)], hasMore: false });
      const { component, flush, element } = setup({ search });
      await flush();

      component.onSearch('pba7');
      await flush();

      expect(search).toHaveBeenLastCalledWith('w1', 'pba7');
      expect(element.textContent).toContain('PBA-0007');
      expect(element.textContent).not.toContain('PBA-0001');
    });

    it('does not search again for the same text', async () => {
      const { component, flush, search } = setup();
      await flush();
      component.onSearch('');
      expect(search).toHaveBeenCalledTimes(1);

      component.onSearch('pba');
      component.onSearch('pba');
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

      expect(element.textContent).toContain('No se encontraron vehículos para «zzz»');
    });

    it('explains when the workshop has no vehicles yet', async () => {
      const { flush, element } = setup({
        search: vi.fn().mockResolvedValue({ items: [], hasMore: false }),
      });
      await flush();
      expect(element.textContent).toContain('Aún no hay vehículos en tu taller');
    });

    it('ignores the answer of a search that was overtaken by a newer one', async () => {
      const slow = deferred<VehiclePage>();
      const fast = deferred<VehiclePage>();
      const search = vi
        .fn()
        .mockResolvedValueOnce(page(1))
        .mockReturnValueOnce(slow.promise)
        .mockReturnValueOnce(fast.promise);
      const { component, flush } = setup({ search });
      await flush();

      component.onSearch('a');
      component.onSearch('ab');
      fast.resolve({ items: [vehicle(2)], hasMore: false });
      await flush();
      slow.resolve({ items: [vehicle(9)], hasMore: true });
      await flush();

      expect(component.items().map((v) => v.id)).toEqual(['v2']);
      expect(component.hasMore()).toBe(false);
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('search in the URL', () => {
    it('starts with no search when the URL has no ?q= (the router then passes undefined)', async () => {
      const { fixture, search, flush, component } = setup();
      fixture.componentRef.setInput('q', undefined);
      await flush();
      expect(search).toHaveBeenCalledWith('w1', '');
      expect(component.query()).toBe('');
    });

    it('starts from the search kept in the URL', async () => {
      const { search, flush, element, component } = setup({ q: '  pba ' });
      await flush();
      expect(search).toHaveBeenCalledWith('w1', 'pba');
      expect(component.query()).toBe('pba');
      expect(element.querySelector('input')?.value).toBe('pba');
    });

    it('writes the search in the URL without adding history entries', async () => {
      const { flush, component } = setup();
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      await flush();
      component.onSearch('pba');
      expect(navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: { q: 'pba' },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        }),
      );
      component.onSearch('');
      expect(navigate).toHaveBeenLastCalledWith(
        [],
        expect.objectContaining({ queryParams: { q: null } }),
      );
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
        .mockResolvedValueOnce({ items: [vehicle(1), vehicle(2)], hasMore: true })
        .mockResolvedValueOnce({ items: [vehicle(3)], hasMore: false });
      const { component, flush, element } = setup({ search });
      await flush();

      await component.loadMore();
      await flush();

      expect(search).toHaveBeenLastCalledWith('w1', '', 2);
      expect(component.items().map((v) => v.id)).toEqual(['v1', 'v2', 'v3']);
      expect(element.textContent).not.toContain('Cargar más');
    });

    it('keeps the loaded vehicles and offers a retry when loading more fails', async () => {
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
      const next = deferred<VehiclePage>();
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
      const more = deferred<VehiclePage>();
      const search = vi
        .fn()
        .mockResolvedValueOnce(page(2, true))
        .mockReturnValueOnce(more.promise)
        .mockResolvedValueOnce({ items: [vehicle(8)], hasMore: false });
      const { component, flush } = setup({ search });
      await flush();

      void component.loadMore();
      component.onSearch('x');
      await flush();
      more.resolve(page(3));
      await flush();

      expect(component.items().map((v) => v.id)).toEqual(['v8']);
    });
  });

  describe('errors', () => {
    it('shows an error with retry, never "no vehicles", when the first load fails', async () => {
      const search = vi.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValue(page(2));
      const { component, flush, element } = setup({ search });
      await flush();

      expect(element.querySelector('[role="alert"]')?.textContent).toContain(
        'No se pudieron cargar los vehículos',
      );
      expect(element.textContent).not.toContain('Aún no hay vehículos');

      component.retry();
      await flush();
      expect(element.textContent).toContain('PBA-0001');
    });
  });

  describe('roles', () => {
    it.each(['owner', 'advisor', 'mechanic'] as const)(
      'shows the same list to the %s, with no register button yet',
      async (role) => {
        const { flush, element } = setup({ role });
        await flush();
        expect(element.textContent).toContain('PBA-0001');
        expect(
          [...element.querySelectorAll('button')].map((b) => b.textContent?.trim()),
        ).not.toContain('Nuevo vehículo');
      },
    );
  });
});
