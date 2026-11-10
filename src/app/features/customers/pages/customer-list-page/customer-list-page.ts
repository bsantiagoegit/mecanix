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
import {
  CustomerInput,
  CustomerSummary,
  customerToInput,
  isSameInput,
} from '../../models/customer.model';
import { CustomerFormState } from '../../services/customer-form.state';
import { CustomersService } from '../../services/customers.service';

/**
 * UC-CUST-02: lista de clientes del taller con búsqueda y paginación. También registra (UC-CUST-01)
 * y edita (UC-CUST-04) clientes en el mismo modal, sin salir de la lista.
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

  /** El modal de cliente está abierto (para registrar o para editar). */
  readonly dialogOpen = signal(false);
  /** Cliente que se está editando; `null` si el modal es para registrar uno nuevo. */
  readonly editingId = signal<string | null>(null);
  /** Datos del cliente a editar, cuando ya se cargaron. */
  readonly editInitial = signal<CustomerInput | null>(null);
  /** Carga del cliente a editar: `loading`, `ready`, `not-found` o `error`. */
  readonly editState = signal<'loading' | 'ready' | 'not-found' | 'error'>('ready');
  readonly dialogTitle = computed(() => (this.editingId() ? 'Editar cliente' : 'Nuevo cliente'));

  /** Registrar y editar clientes es de `owner` y `advisor`; el mecánico no ve los botones. */
  readonly canManage = computed(() => this.auth.hasRole('owner', 'advisor'));
  /** El mecánico solo ve y busca por nombre: la base de datos no le da el resto. */
  readonly byNameOnly = computed(() => this.auth.role() === 'mechanic');
  readonly placeholder = computed(() =>
    this.byNameOnly() ? 'Nombre o apellido' : 'Nombre, celular o cédula',
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

  /** Abre el modal para registrar, con un formulario limpio. */
  openCreate(): void {
    this.form.reset();
    this.editingId.set(null);
    this.editInitial.set(null);
    this.editState.set('ready');
    this.dialogOpen.set(true);
  }

  /** Abre el modal para editar: carga el cliente completo (la lista no trae la dirección). */
  async openEdit(customer: CustomerSummary): Promise<void> {
    this.form.reset();
    this.editingId.set(customer.id);
    this.editInitial.set(null);
    this.editState.set('loading');
    this.dialogOpen.set(true);
    await this.loadEditing(customer.id);
  }

  retryEdit(): void {
    const id = this.editingId();
    if (id) {
      this.editState.set('loading');
      void this.loadEditing(id);
    }
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  /** Guarda lo escrito: registra o actualiza según el modal; si sale bien, lo cierra y actualiza la lista. */
  async onSubmit(input: CustomerInput): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId) return;

    const id = this.editingId();
    const initial = this.editInitial();
    if (id && initial && isSameInput(input, initial)) {
      this.toast.info('No hay cambios que guardar');
      return;
    }

    const result = await this.form.save(
      () =>
        id
          ? this.customers.update(workshopId, id, input)
          : this.customers.create(workshopId, input),
      id
        ? 'No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.'
        : 'No se pudo registrar el cliente. Revisa tu conexión e inténtalo de nuevo.',
    );
    if (!result.ok) {
      // El cliente desapareció mientras se editaba: ya no hay nada que guardar.
      if (result.reason === 'not-found') this.editState.set('not-found');
      return;
    }

    this.closeDialog();
    this.toast.success(id ? 'Cambios guardados' : 'Cliente registrado');
    this.retry();
  }

  /** Al salir del celular: aviso (no bloquea) si otros clientes del taller ya lo usan. */
  async onPhoneChecked(phone: string): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId) return;
    const id = this.editingId();
    // Editando, no cuenta el propio cliente ni el celular que ya tenía.
    await this.form.checkPhone(
      workshopId,
      phone,
      id ? { excludeId: id, ownPhone: this.editInitial()?.phone } : {},
    );
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

  private async loadEditing(id: string): Promise<void> {
    try {
      const customer = await this.customers.getById(id);
      // Se cerró el modal o se abrió otro cliente mientras cargaba: se descarta.
      if (this.editingId() !== id || !this.dialogOpen()) return;
      if (!customer) {
        this.editState.set('not-found');
        return;
      }
      this.editInitial.set(customerToInput(customer));
      this.editState.set('ready');
    } catch {
      if (this.editingId() === id) this.editState.set('error');
    }
  }
}
