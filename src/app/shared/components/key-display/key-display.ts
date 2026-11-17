import { Component, input, signal } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * La clave de un vehículo con un botón de ojo para verla u ocultarla. Empieza oculta (`•••••`):
 * es por comodidad de uso (que no se lea por encima del hombro), no por seguridad, porque todos
 * los roles del taller pueden verla (D-DS-17). Sin clave (`null`) no muestra nada. El estado
 * (visible u oculta) es local al componente.
 */
@Component({
  selector: 'app-key-display',
  imports: [Icon],
  templateUrl: './key-display.html',
})
export class KeyDisplay {
  readonly keyCode = input<string | null>(null);
  readonly size = input<'sm' | 'md'>('md');

  readonly revealed = signal(false);

  toggle(): void {
    this.revealed.update((revealed) => !revealed);
  }
}
