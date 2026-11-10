import { Component, computed, effect, inject, signal } from '@angular/core';
import { AuthFacade } from '@core/auth';
import { WorkshopFacade } from '@core/workshops';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { Modal } from '@shared/components/modal/modal';
import { ToastService } from '@shared/services/toast.service';
import { CustomerCard } from '../../components/customer-card/customer-card';
import { CustomerForm } from '../../components/customer-form/customer-form';
import { CustomerSearch } from '../../components/customer-search/customer-search';
import { CustomerInput, CustomerSummary } from '../../models/customer.model';
import { CustomerFormState } from '../../services/customer-form.state';
import { CustomersService } from '../../services/customers.service';

/**
 * UC-CUST-02: lista de clientes del taller con búsqueda y paginación. También registra clientes
 * nuevos (UC-CUST-01) en un modal, sin salir de la lista.
 */
@Component({
  selector: 'app-customer-list-page',
  imports: [Button, Card, CustomerCard, CustomerForm, CustomerSearch, Modal],
  providers: [CustomerFormState],
  templateUrl: './customer-list-page.html',
})
export class CustomerListPage {
  private readonly customers = inject(CustomersService);
  private readonly workshops = inject(WorkshopFacade);
  private readonly toast = inject(ToastService);
  readonly form = inject(CustomerFormState);
  readonly auth = inject(AuthFacade);

  /** Texto buscado (ya sin espacios sobrantes). Vacío lista todos. */
  readonly query = signal('');
  readonly items = signal<CustomerSummary[]>([]);
  readonly hasMore = signal(false);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly moreError = signal<string | null>(null);

  /** El modal "Nuevo cliente" está abierto. */
  readonly createOpen = signal(false);

  /** Registrar clientes es de `owner` y `advisor`; el mecánico no ve los botones. */
  readonly canCreate = computed(() => this.auth.hasRole('owner', 'advisor'));
  /** El mecánico solo ve y busca por nombre: la base de datos no le da el resto. */
  readonly byNameOnly = computed(() => this.auth.role() === 'mechanic');
  readonly placeholder = computed(() =>
    this.byNameOnly() ? 'Nombre o apellido' : 'Nombre, teléfono o identificación',
  );

  /** Se descartan las respuestas de una búsqueda que ya quedó atrás (llegan desordenadas). */
  private requestId = 0;
  private loadedWorkshopId: string | null = null;

  constructor() {
    effect(() => {
      const id = this.workshops.activeId();
      if (id && id !== this.loadedWorkshopId) {
        this.loadedWorkshopId = id;
        void this.load(id, this.query());
      }
    });
  }

  onSearch(text: string): void {
    if (text === this.query()) return;
    this.query.set(text);
    const workshopId = this.workshops.activeId();
    if (workshopId) void this.load(workshopId, text);
  }

  async loadMore(): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId || this.isLoadingMore() || !this.hasMore()) return;

    const request = this.requestId;
    this.isLoadingMore.set(true);
    this.moreError.set(null);
    try {
      const page = await this.customers.search(workshopId, this.query(), this.items().length);
      if (request !== this.requestId) return;
      this.items.update((current) => [...current, ...page.items]);
      this.hasMore.set(page.hasMore);
    } catch {
      if (request === this.requestId) {
        this.moreError.set('No se pudieron cargar más clientes. Inténtalo de nuevo.');
      }
    } finally {
      if (request === this.requestId) this.isLoadingMore.set(false);
    }
  }

  /** Abre el modal con un formulario limpio. */
  openCreate(): void {
    this.form.reset();
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
  }

  /** Registra el cliente; si sale bien cierra el modal y actualiza la lista. */
  async onCreate(input: CustomerInput): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId) return;

    const result = await this.form.save(
      () => this.customers.create(workshopId, input),
      'No se pudo registrar el cliente. Revisa tu conexión e inténtalo de nuevo.',
    );
    if (!result.ok) return;

    this.closeCreate();
    this.toast.success('Cliente registrado');
    this.retry();
  }

  /** Al salir del teléfono: aviso (no bloquea) si otros clientes del taller ya lo usan. */
  async onPhoneChecked(phone: string): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (workshopId) await this.form.checkPhone(workshopId, phone);
  }

  retry(): void {
    const workshopId = this.workshops.activeId();
    if (workshopId) void this.load(workshopId, this.query());
  }

  private async load(workshopId: string, query: string): Promise<void> {
    const request = ++this.requestId;
    this.isLoading.set(true);
    this.isLoadingMore.set(false);
    this.loadError.set(null);
    this.moreError.set(null);
    try {
      const page = await this.customers.search(workshopId, query);
      if (request !== this.requestId) return;
      this.items.set(page.items);
      this.hasMore.set(page.hasMore);
    } catch {
      if (request !== this.requestId) return;
      // Un fallo no se muestra como "no hay clientes": se avisa y se ofrece reintentar.
      this.items.set([]);
      this.hasMore.set(false);
      this.loadError.set(
        'No se pudieron cargar los clientes. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      if (request === this.requestId) this.isLoading.set(false);
    }
  }
}
