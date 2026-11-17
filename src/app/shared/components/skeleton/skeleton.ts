import { Component, computed, input } from '@angular/core';
import { cn } from '../../utils/cn';

export type SkeletonVariant = 'text' | 'circle' | 'rect';

/**
 * Marcador de carga con la forma del contenido que va a llegar. Es decorativo (`aria-hidden`):
 * quien lo usa envuelve el bloque en un contenedor con `role="status"` y un texto para lectores
 * de pantalla.
 */
@Component({
  selector: 'app-skeleton',
  templateUrl: './skeleton.html',
})
export class Skeleton {
  readonly variant = input<SkeletonVariant>('text');
  readonly width = input('100%');
  /** Si no se indica, depende de la variante (texto: 1rem; círculo: igual al ancho; rect: 2.75rem). */
  readonly height = input<string | null>(null);
  readonly count = input(1);

  readonly items = computed(() => Array.from({ length: Math.max(1, this.count()) }, (_, i) => i));

  readonly classes = computed(() =>
    cn(
      'block bg-neutral-200 dark:bg-neutral-800 motion-safe:animate-pulse',
      this.variant() === 'circle'
        ? 'rounded-full'
        : this.variant() === 'text'
          ? 'rounded'
          : 'rounded-md',
    ),
  );

  readonly resolvedHeight = computed(
    () =>
      this.height() ??
      (this.variant() === 'circle' ? this.width() : this.variant() === 'text' ? '1rem' : '2.75rem'),
  );
}
