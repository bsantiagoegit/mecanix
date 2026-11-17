import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthFacade } from '@core/auth';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { CustomerDialog } from '../../components/customer-dialog/customer-dialog';
import { CustomerVehicleList } from '../../components/customer-vehicle-list/customer-vehicle-list';
import { Customer, CustomerVehicle } from '../../models/customer.model';
import { CustomerDialogState } from '../../services/customer-dialog.state';
import { CustomerFormState } from '../../services/customer-form.state';
import { CustomersService } from '../../services/customers.service';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

/**
 * UC-CUST-03 y UC-CUST-05: el detalle de un cliente con sus vehículos actuales y el historial de
 * los que tuvo. `owner` y `advisor` ven además sus datos de contacto y pueden editarlo (mismo
 * modal que la lista); el `mechanic` ve solo el nombre, porque la base de datos no le da más.
 */
@Component({
  selector: 'app-customer-detail-page',
  imports: [Button, Card, CustomerDialog, CustomerVehicleList, RouterLink, Skeleton],
  providers: [CustomerFormState, CustomerDialogState],
  templateUrl: './customer-detail-page.html',
})
export class CustomerDetailPage {
  private readonly customers = inject(CustomersService);
  readonly auth = inject(AuthFacade);
  readonly dialog = inject(CustomerDialogState);
  readonly form = this.dialog.form;

  /** Viene de la ruta (`/customers/:id`). */
  readonly id = input.required<string>();
  /** Búsqueda de la lista de la que se llegó (`?q=`), para volver a ella tal como estaba. */
  readonly q = input<string | undefined>('');

  readonly customer = signal<Customer | null>(null);
  readonly state = signal<LoadState>('loading');
  readonly vehicles = signal<CustomerVehicle[]>([]);
  readonly vehiclesState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly historyOpen = signal(false);

  /** Contacto y edición son de `owner` y `advisor`. */
  readonly canManage = computed(() => this.auth.hasRole('owner', 'advisor'));
  readonly current = computed(() => this.vehicles().filter((v) => v.endedAt === null));
  readonly fullName = computed(() => {
    const customer = this.customer();
    return customer ? `${customer.firstName} ${customer.lastName}` : '';
  });
  readonly backParams = computed(() => {
    const q = this.q();
    return q ? { q } : null;
  });
  readonly skeletonRows = [1, 2, 3];

  /** Se descartan las respuestas de un cliente que ya quedó atrás (se cambió de `id`). */
  private requestId = 0;

  constructor() {
    this.dialog.onSaved = () => void this.loadCustomer(this.id());
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.historyOpen.set(false);
        void this.load(id);
      });
    });
  }

  retry(): void {
    void this.load(this.id());
  }

  retryVehicles(): void {
    void this.loadVehicles(this.id(), this.requestId);
  }

  toggleHistory(): void {
    this.historyOpen.update((open) => !open);
  }

  private async load(id: string): Promise<void> {
    const request = ++this.requestId;
    this.customer.set(null);
    this.vehicles.set([]);
    this.state.set('loading');
    this.vehiclesState.set('loading');
    // El cliente y sus vehículos van en paralelo: el nombre aparece sin esperar a los vehículos.
    await Promise.all([this.loadCustomer(id, request), this.loadVehicles(id, request)]);
  }

  private async loadCustomer(id: string, request = this.requestId): Promise<void> {
    try {
      const customer = this.canManage()
        ? await this.customers.getById(id)
        : await this.customers.getNameById(id);
      if (request !== this.requestId) return;
      this.customer.set(customer);
      this.state.set(customer ? 'ready' : 'not-found');
    } catch {
      if (request === this.requestId) this.state.set('error');
    }
  }

  private async loadVehicles(id: string, request: number): Promise<void> {
    this.vehiclesState.set('loading');
    try {
      const vehicles = await this.customers.listVehicles(id);
      if (request !== this.requestId) return;
      this.vehicles.set(vehicles);
      this.vehiclesState.set('ready');
    } catch {
      if (request === this.requestId) this.vehiclesState.set('error');
    }
  }
}
