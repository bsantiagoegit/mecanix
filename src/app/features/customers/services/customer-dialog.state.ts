import { Injectable, computed, inject, signal } from '@angular/core';
import { WorkshopFacade } from '@core/workshops';
import { ToastService } from '@shared/services/toast.service';
import { CustomerInput, customerToInput, isSameInput } from '../models/customer.model';
import { CustomerFormState } from './customer-form.state';
import { CustomersService } from './customers.service';

/** Qué muestra el modal: el formulario (`ready`), la carga del cliente a editar o un fallo. */
export type CustomerDialogView = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * Estado del modal de cliente: registrar uno nuevo (UC-CUST-01) o editar uno existente
 * (UC-CUST-04). Lo usan la lista y el detalle, que lo proveen cada uno (no es global) y le dicen
 * qué hacer cuando se guarda algo con `onSaved`.
 */
@Injectable()
export class CustomerDialogState {
  private readonly customers = inject(CustomersService);
  private readonly workshops = inject(WorkshopFacade);
  private readonly toast = inject(ToastService);
  readonly form = inject(CustomerFormState);

  /** El modal está abierto (para registrar o para editar). */
  readonly isOpen = signal(false);
  /** Cliente que se está editando; `null` si el modal es para registrar uno nuevo. */
  readonly editingId = signal<string | null>(null);
  /** Datos del cliente a editar, cuando ya se cargaron. */
  readonly editInitial = signal<CustomerInput | null>(null);
  readonly view = signal<CustomerDialogView>('ready');
  readonly title = computed(() => (this.editingId() ? 'Editar cliente' : 'Nuevo cliente'));

  /** Quien usa el estado lo asigna para refrescar lo que muestra tras guardar. */
  onSaved: () => void = () => {};

  /** Abre el modal para registrar, con un formulario limpio. */
  openCreate(): void {
    this.form.reset();
    this.editingId.set(null);
    this.editInitial.set(null);
    this.view.set('ready');
    this.isOpen.set(true);
  }

  /** Abre el modal para editar: carga el cliente completo (la lista no trae la dirección). */
  async openEdit(id: string): Promise<void> {
    this.form.reset();
    this.editingId.set(id);
    this.editInitial.set(null);
    this.view.set('loading');
    this.isOpen.set(true);
    await this.loadEditing(id);
  }

  retryEdit(): void {
    const id = this.editingId();
    if (id) {
      this.view.set('loading');
      void this.loadEditing(id);
    }
  }

  close(): void {
    this.isOpen.set(false);
  }

  /** Guarda lo escrito: registra o actualiza según el modal; si sale bien, lo cierra y avisa. */
  async submit(input: CustomerInput): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId || this.form.isSubmitting()) return;

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
      if (result.reason === 'not-found') this.view.set('not-found');
      return;
    }

    this.close();
    this.toast.success(id ? 'Cambios guardados' : 'Cliente registrado');
    this.onSaved();
  }

  /** Al salir del celular: aviso (no bloquea) si otros clientes del taller ya lo usan. */
  async checkPhone(phone: string): Promise<void> {
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

  private async loadEditing(id: string): Promise<void> {
    try {
      const customer = await this.customers.getById(id);
      // Se cerró el modal o se abrió otro cliente mientras cargaba: se descarta.
      if (this.editingId() !== id || !this.isOpen()) return;
      if (!customer) {
        this.view.set('not-found');
        return;
      }
      this.editInitial.set(customerToInput(customer));
      this.view.set('ready');
    } catch {
      if (this.editingId() === id) this.view.set('error');
    }
  }
}
