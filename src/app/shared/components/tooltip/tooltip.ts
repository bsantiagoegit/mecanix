import { Component, ElementRef, inject, input, signal, viewChild } from '@angular/core';

interface TooltipPosition {
  top: number | null;
  bottom: number | null;
  left: number;
}

let nextId = 0;
const GAP = 8;
const MARGIN = 8;
const WIDTH = 288;

/**
 * Botón "i" que muestra un recuadro con ayuda. Se abre al pasar el ratón, al enfocarlo con el
 * teclado y al tocarlo (en el móvil no hay hover); `Esc` lo cierra. El contenido se proyecta, así
 * que puede ser texto o un componente. El recuadro es `fixed` para no quedar recortado y se abre
 * hacia arriba (hacia abajo si no hay lugar).
 */
@Component({
  selector: 'app-tooltip',
  host: {
    class: 'inline-flex',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(window:resize)': 'hide()',
  },
  templateUrl: './tooltip.html',
})
export class Tooltip {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  readonly tooltipId = `tooltip-${nextId++}`;
  /** Nombre accesible del botón. */
  readonly ariaLabel = input('Más información');

  readonly isOpen = signal(false);
  readonly position = signal<TooltipPosition | null>(null);
  readonly width = WIDTH;

  private pinned = false;

  show(): void {
    if (this.isOpen()) return;
    const rect = this.trigger().nativeElement.getBoundingClientRect();
    const width = Math.min(WIDTH, window.innerWidth - MARGIN * 2);
    const left = Math.min(Math.max(rect.left, MARGIN), window.innerWidth - width - MARGIN);
    // Arriba por defecto: así no tapa el campo que se está escribiendo justo debajo de la etiqueta.
    const up = rect.top > 220;
    this.position.set({
      top: up ? null : rect.bottom + GAP,
      bottom: up ? window.innerHeight - rect.top + GAP : null,
      left,
    });
    this.isOpen.set(true);
  }

  hide(): void {
    this.pinned = false;
    this.isOpen.set(false);
  }

  onEnter(): void {
    this.show();
  }

  onLeave(): void {
    if (!this.pinned) this.hide();
  }

  onFocus(): void {
    this.show();
  }

  onBlur(): void {
    this.hide();
  }

  /** Un toque o clic lo fija abierto (o lo cierra si ya estaba fijo). */
  onClick(): void {
    if (this.pinned) {
      this.hide();
      return;
    }
    this.pinned = true;
    this.show();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.isOpen()) {
      // Dentro de un modal, Esc cierra solo la ayuda.
      event.preventDefault();
      event.stopPropagation();
      this.hide();
    }
  }

  onDocumentPointerDown(event: Event): void {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) this.hide();
  }
}
