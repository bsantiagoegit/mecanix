import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { WorkshopFacade } from '@core/workshops';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { ToastService } from '@shared/services/toast.service';
import { CustomerForm } from '../../components/customer-form/customer-form';
import { Customer, CustomerInput, isSameInput } from '../../models/customer.model';
import { CustomerFormState } from '../../services/customer-form.state';
import { CustomersService } from '../../services/customers.service';

/** `loading`: se carga el cliente · `ready`: se puede editar · `not-found` / `error`: no se puede. */
type PageState = 'loading' | 'ready' | 'not-found' | 'error';

function toInput(customer: Customer): CustomerInput {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone ?? '',
    // Clientes antiguos pueden no tener estos datos: el formulario los pide.
    email: customer.email ?? '',
    identification: customer.identification ?? '',
    address: customer.address ?? '',
  };
}

/**
 * UC-CUST-04: editar un cliente (`/customers/:id/edit`). Solo `owner` y `advisor` (lo exige la
 * ruta y la base de datos). Registrar un cliente nuevo es un modal de la lista (UC-CUST-01).
 */
@Component({
  selector: 'app-customer-edit-page',
  imports: [RouterLink, Button, Card, CustomerForm],
  providers: [CustomerFormState],
  templateUrl: './customer-edit-page.html',
})
export class CustomerEditPage {
  private readonly customers = inject(CustomersService);
  private readonly workshops = inject(WorkshopFacade);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly form = inject(CustomerFormState);

  /** `:id` de la ruta. */
  readonly id = input.required<string>();

  readonly state = signal<PageState>('loading');
  readonly initial = signal<CustomerInput | null>(null);

  constructor() {
    effect(() => {
      const id = this.id();
      if (this.workshops.activeId()) untracked(() => void this.load(id));
    });
  }

  async onSubmit(input: CustomerInput): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId) return;

    const initial = this.initial();
    if (initial && isSameInput(input, initial)) {
      this.toast.info('No hay cambios que guardar');
      return;
    }

    const result = await this.form.save(
      () => this.customers.update(workshopId, this.id(), input),
      'No se pudieron guardar los cambios. Revisa tu conexión e inténtalo de nuevo.',
    );
    if (result.ok) {
      this.toast.success('Cambios guardados');
      await this.router.navigateByUrl('/customers');
    } else if (result.reason === 'not-found') {
      this.state.set('not-found');
    }
  }

  /** Al salir del teléfono: aviso (no bloquea) si otros clientes ya lo usan. */
  async onPhoneChecked(phone: string): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId) return;
    await this.form.checkPhone(workshopId, phone, {
      excludeId: this.id(),
      ownPhone: this.initial()?.phone,
    });
  }

  retry(): void {
    void this.load(this.id());
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
}
