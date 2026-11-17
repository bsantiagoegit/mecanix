import { Component, computed, input } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';
import { APP_ICONS, AppIconName } from './icons';

/**
 * Icono de Lucide por nombre (ver `icons.ts`). Hereda el color del texto (`currentColor`) y es
 * decorativo por defecto (`aria-hidden`): el botón o enlace que lo contiene lleva el nombre
 * accesible. Con `title` pasa a ser un icono con significado propio y lo anuncia.
 */
@Component({
  selector: 'app-icon',
  imports: [LucideDynamicIcon],
  host: { class: 'inline-flex shrink-0 items-center justify-center' },
  templateUrl: './icon.html',
})
export class Icon {
  readonly name = input.required<AppIconName>();
  /** Alto y ancho en píxeles. */
  readonly size = input(16);
  readonly strokeWidth = input(2);
  /** Texto accesible; sin él, el icono se oculta a los lectores de pantalla. */
  readonly title = input<string | null>(null);

  readonly icon = computed(() => APP_ICONS[this.name()]);
}
