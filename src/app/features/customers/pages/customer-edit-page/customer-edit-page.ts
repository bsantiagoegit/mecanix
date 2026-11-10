import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NotFoundError } from '@core/errors';
import { WorkshopFacade } from '@core/workshops';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { ToastService } from '@shared/services/toast.service';
import {
  CustomerForm,
  IdentificationConflict,
  PhoneWarning,
} from '../../components/customer-form/customer-form';
import { Customer, CustomerInput, isSameInput } from '../../models/customer.model';
import { CustomerPrefill } from '../../models/customer-prefill';
import { DuplicateIdentificationError } from '../../models/duplicate-identification.error';
import { CustomersService } from '../../services/customers.service';

/** `loading`: se carga el cliente a editar · `ready`: se puede escribir · `not-found` / `error`: no se puede editar. */
type PageState = 'loading' | 'ready' | 'not-found' | 'error';

function toInput(customer: Customer): CustomerInput {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone ?? '',
    email: customer.email,
    identification: customer.identification,
    address: customer.address,
  };
}

/**
 * UC-CUST-01 y UC-CUST-04: registrar un cliente (`/customers/new`) o editarlo
 * (`/customers/:id/edit`). Solo `owner` y `advisor` (lo exige la ruta y la base de datos).
 */
@Component({
  selector: 'app-customer-form-page',
  imports: [RouterLink, Button, Card, CustomerForm],
  templateUrl: './customer-form-page.html',
})
export class CustomerFormPage {
  private readonly customers = inject(CustomersService);
  private readonly workshops = inject(WorkshopFacade);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** `:id` de la ruta de edición; sin él se registra un cliente nuevo. */
  readonly id = input<string>();
  /** Valores sugeridos (parámetros de la URL) al registrar, p. ej. lo que se buscó sin encontrar. */
  readonly firstName = input<string>();
  readonly lastName = input<string>();
  readonly phone = input<string>();

  readonly isEdit = computed(() => !!this.id());
  readonly prefill = computed<CustomerPrefill>(() => {
    const result: CustomerPrefill = {};
    if (this.firstName()) result.firstName = this.firstName();
    if (this.lastName()) result.lastName = this.lastName();
    if (this.phone()) result.phone = this.phone();
    return result;
  });

  readonly state = signal<PageState>('loading');
  readonly initial = signal<CustomerInput | null>(null);
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly phoneWarning = signal<PhoneWarning | null>(null);
  readonly conflict = signal<IdentificationConflict | null>(null);

  /** Se descarta el resultado de una comprobación de teléfono que ya quedó atrás. */
  private phoneCheck = 0;

  constructor() {
    effect(() => {
      const id = this.id();
      const workshopId = this.workshops.activeId();
      if (!id) {
        this.state.set('ready');
      } else if (workshopId) {
        untracked(() => void this.load(id));
      }
    });
  }

  async onSubmit(input: CustomerInput): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId) return;

    const id = this.id();
    const initial = this.initial();
    if (id && initial && isSameInput(input, initial)) {
      this.toast.info('No hay cambios que guardar');
      return;
    }

    this.isSubmitting.set(true);
    this.error.set(null);
    this.conflict.set(null);
    try {
      if (id) {
        await this.customers.update(workshopId, id, input);
      } else {
        await this.customers.create(workshopId, input);
      }
    } catch (err) {
      this.isSubmitting.set(false);
      this.handleFailure(err);
      return;
    }
    this.isSubmitting.set(false);
    this.toast.success(id ? 'Cambios guardados' : 'Cliente registrado');
    await this.router.navigateByUrl('/customers');
  }

  /** Al salir del teléfono: aviso (no bloqueante) si otros clientes ya usan ese número. */
  async onPhoneChecked(phone: string): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId) return;
    // Editando, el teléfono que el cliente ya tenía no es un duplicado nuevo.
    if (phone === this.initial()?.phone) {
      this.phoneWarning.set(null);
      return;
    }

    const check = ++this.phoneCheck;
    try {
      const matches = await this.customers.findByPhone(workshopId, phone, this.id());
      if (check === this.phoneCheck) this.phoneWarning.set({ phone, matches });
    } catch {
      // El aviso es opcional: si no se puede consultar, el usuario sigue y la base decide al guardar.
    }
  }

  retry(): void {
    const id = this.id();
    if (id) void this.load(id);
  }

  private async load(id: string): Promise<void> {
    this.state.set('loading');
    try {
      const customer = await this.customers.getById(id);
      if (!customer) {
        this.state.set('not-found');
        return;
      }
      this.initial.set(toInput(customer));
      this.state.set('ready');
    } catch {
      this.state.set('error');
    }
  }

  private handleFailure(err: unknown): void {
    if (err instanceof DuplicateIdentificationError) {
      this.conflict.set({ identification: err.identification, existing: err.existing });
    } else if (err instanceof NotFoundError) {
      this.state.set('not-found');
    } else {
      // El formulario no se toca: se conserva lo escrito para reintentar.
      this.error.set(
        this.id()
          ? 'No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.'
          : 'No se pudo registrar el cliente. Revisa tu conexión e inténtalo de nuevo.',
      );
    }
  }
}
