import { Component, computed, input } from '@angular/core';
import { CustomerSummary } from '../../models/customer.model';

/** Una fila de la lista de clientes: nombre y, si el rol los puede ver, sus datos de contacto. */
@Component({
  selector: 'app-customer-card',
  templateUrl: './customer-card.html',
})
export class CustomerCard {
  readonly customer = input.required<CustomerSummary>();

  readonly fullName = computed(() => `${this.customer().firstName} ${this.customer().lastName}`);
}
