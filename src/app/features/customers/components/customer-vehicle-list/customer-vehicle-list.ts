import { Component, input } from '@angular/core';
import { CustomerVehicle, formatDate } from '../../models/customer.model';

/**
 * Los vehículos de un cliente: placa, marca, modelo y año. Con `showPeriod`, también desde y
 * hasta cuándo fue suyo y si es «Actual» o «Anterior» (historial, UC-CUST-05). Los vehículos
 * eliminados siguen apareciendo, marcados. Todavía no enlaza al detalle del vehículo (llega con la
 * feature de vehículos).
 */
@Component({
  selector: 'app-customer-vehicle-list',
  templateUrl: './customer-vehicle-list.html',
})
export class CustomerVehicleList {
  readonly vehicles = input.required<readonly CustomerVehicle[]>();
  readonly label = input('Vehículos');
  readonly showPeriod = input(false);

  readonly formatDate = formatDate;
}
