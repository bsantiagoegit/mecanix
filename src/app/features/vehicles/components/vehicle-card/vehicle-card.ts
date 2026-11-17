import { Component, computed, input } from '@angular/core';
import { Icon } from '@shared/components/icon/icon';
import { KeyDisplay } from '@shared/components/key-display/key-display';
import { VehicleSummary } from '../../models/vehicle.model';

/**
 * Una fila de la lista de vehículos: placa, marca, modelo y año, propietario actual y la clave
 * (oculta, con ojo) o "Sin clave".
 */
@Component({
  selector: 'app-vehicle-card',
  imports: [Icon, KeyDisplay],
  templateUrl: './vehicle-card.html',
})
export class VehicleCard {
  readonly vehicle = input.required<VehicleSummary>();

  readonly ownerName = computed(() => {
    const owner = this.vehicle().owner;
    return owner ? `${owner.firstName} ${owner.lastName}` : null;
  });
}
