import {
  Component,
  ElementRef,
  computed,
  effect,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import { cn } from '../../utils/cn';

let nextId = 0;

export type ModalSize = 'sm' | 'md' | 'lg';

/**
 * Diálogo modal sobre el `<dialog>` nativo: el navegador aporta la trampa de foco, el cierre con
 * `Esc`, el fondo inerte y la devolución del foco a quien lo abrió, sin dependencias extra.
 *
 * - Se abre y se cierra con `[(isOpen)]`. Al cerrarse (X, `Esc` o desde fuera) emite `closed`.
 * - El fondo **no** cierra el modal: un clic fuera por error no debe perder lo escrito.
 * - El contenido proyectado se crea al instanciar el padre: para que un formulario empiece
 *   limpio cada vez, envolverlo en `@if (isOpen())`.
 * - Al abrirse, el foco va al primer campo del contenido (no al botón de cerrar).
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
})
export class Modal {
  readonly title = input.required<string>();
  readonly size = input<ModalSize>('md');
  /** Con `false` no hay botón de cerrar y `Esc` no lo cierra: solo el padre puede hacerlo. */
  readonly closable = input(true);

  readonly isOpen = model(false);
  readonly closed = output<void>();

  readonly titleId = `modal-title-${nextId++}`;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  readonly classes = computed(() =>
    cn(
      'm-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] rounded-lg border border-border bg-surface p-0 text-fg shadow-xl',
      'backdrop:bg-black/50',
      this.size() === 'sm' && 'max-w-sm',
      this.size() === 'md' && 'max-w-lg',
      this.size() === 'lg' && 'max-w-2xl',
    ),
  );

  constructor() {
    effect(() => {
      const element = this.dialog().nativeElement;
      if (this.isOpen() && !element.open) {
        element.showModal();
        this.focusFirstField(element);
      } else if (!this.isOpen() && element.open) {
        element.close();
      }
    });
  }

  /** Botón de cerrar. */
  requestClose(): void {
    if (this.closable()) this.dialog().nativeElement.close();
  }

  /** `Esc` en un modal no cerrable se ignora. */
  onCancel(event: Event): void {
    if (!this.closable()) event.preventDefault();
  }

  /** El diálogo se cerró (X, `Esc` o desde el padre): se sincroniza el estado y se avisa. */
  onNativeClose(): void {
    if (this.isOpen()) this.isOpen.set(false);
    this.closed.emit();
  }

  private focusFirstField(element: HTMLDialogElement): void {
    const field = element.querySelector<HTMLElement>(
      '[autofocus], input:not([type="hidden"]):not([disabled]), select, textarea',
    );
    field?.focus();
  }
}
