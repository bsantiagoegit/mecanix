import {
  Component,
  ElementRef,
  computed,
  forwardRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { cn } from '../../utils/cn';
import { Icon } from '../icon/icon';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface PanelPosition {
  top: number | null;
  bottom: number | null;
  left: number;
  width: number;
  maxHeight: number;
}

let nextId = 0;
const PANEL_MAX_HEIGHT = 240;
const PANEL_GAP = 4;
const VIEWPORT_MARGIN = 8;
const TYPEAHEAD_RESET_MS = 600;

/**
 * Desplegable propio (patrón ARIA "select-only combobox"): se ve igual en todos los sistemas
 * operativos porque el panel lo dibuja la app, no el navegador. Funciona con formularios reactivos
 * (`formControlName`) y también suelto, con `[value]` y `(valueChange)`.
 *
 * Teclado: Enter, Espacio y flechas abren; flechas, Inicio y Fin mueven; Enter o Espacio eligen;
 * Esc y Tab cierran; escribir una letra salta a la opción que empieza así.
 */
@Component({
  selector: 'app-select',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select), multi: true }],
  host: {
    class: 'block',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
    '(window:resize)': 'close()',
  },
  imports: [Icon],
  templateUrl: './select.html',
})
export class Select implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  readonly selectId = `select-${nextId++}`;
  readonly listboxId = `${this.selectId}-listbox`;

  readonly options = input<readonly SelectOption[]>([]);
  readonly label = input('');
  readonly placeholder = input('Selecciona una opción');
  readonly hint = input('');
  readonly error = input('');
  readonly required = input(false);
  readonly disabled = input(false);
  /** Nombre accesible cuando no hay `label` visible (p. ej. un desplegable dentro de una fila). */
  readonly ariaLabel = input<string | null>(null);
  readonly size = input<'sm' | 'md'>('md');

  readonly value = model<string | null>(null);

  readonly isOpen = signal(false);
  readonly activeIndex = signal(-1);
  readonly position = signal<PanelPosition | null>(null);
  private readonly formDisabled = signal(false);

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};
  private typeahead = '';
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());

  readonly selected = computed(() => this.options().find((o) => o.value === this.value()) ?? null);

  readonly triggerClasses = computed(() =>
    cn(
      'flex w-full items-center justify-between gap-2 rounded-md border bg-surface text-left text-fg transition-colors',
      'focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
      this.size() === 'sm' ? 'h-9 px-2 text-sm' : 'h-11 px-3 text-base',
      this.error()
        ? 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/20'
        : 'border-border focus:border-primary-500 focus:ring-primary-500/20',
    ),
  );

  focusTrigger(): void {
    this.trigger()?.nativeElement.focus();
  }

  optionClasses(option: SelectOption, index: number): string {
    return cn(
      'flex items-center gap-2 px-3 py-2 text-sm',
      index === this.activeIndex() && 'bg-neutral-100 dark:bg-neutral-800',
      option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    );
  }

  optionId(index: number): string {
    return `${this.selectId}-option-${index}`;
  }

  // ---- ControlValueAccessor ----
  writeValue(value: string | null): void {
    this.value.set(value ?? null);
  }
  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
    if (isDisabled) this.close();
  }

  // ---- Abrir y cerrar ----
  toggle(): void {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open(): void {
    if (this.isDisabled() || this.isOpen()) return;
    const options = this.options();
    const selectedIndex = options.findIndex((o) => o.value === this.value() && !o.disabled);
    this.position.set(this.computePosition());
    this.activeIndex.set(selectedIndex >= 0 ? selectedIndex : this.nextEnabled(-1, 1));
    this.isOpen.set(true);
    document.addEventListener('scroll', this.onAnyScroll, true);
    queueMicrotask(() => this.scrollActiveIntoView());
  }

  close(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    document.removeEventListener('scroll', this.onAnyScroll, true);
    this.activeIndex.set(-1);
    this.onTouched();
  }

  private choose(index: number): void {
    const option = this.options()[index];
    if (!option || option.disabled) return;
    this.close();
    this.trigger()?.nativeElement.focus();
    if (option.value === this.value()) return;
    this.value.set(option.value);
    this.onChange(option.value);
  }

  onOptionClick(index: number): void {
    this.choose(index);
  }

  onOptionHover(index: number): void {
    if (!this.options()[index]?.disabled) this.activeIndex.set(index);
  }

  // ---- Teclado ----
  onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) return;
    const open = this.isOpen();

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        if (!open) {
          this.open();
          return;
        }
        this.move(event.key === 'ArrowDown' ? 1 : -1);
        return;
      }
      case 'Home':
      case 'End': {
        if (!open) return;
        event.preventDefault();
        this.activeIndex.set(
          event.key === 'Home'
            ? this.nextEnabled(-1, 1)
            : this.nextEnabled(this.options().length, -1),
        );
        this.scrollActiveIntoView();
        return;
      }
      case 'Enter':
      case ' ': {
        if (event.key === ' ' && this.typeahead) break; // el espacio forma parte de lo que se escribe
        event.preventDefault();
        if (open) this.choose(this.activeIndex());
        else this.open();
        return;
      }
      case 'Escape': {
        if (!open) return;
        // Dentro de un modal, Esc cierra solo el desplegable, no el modal.
        event.preventDefault();
        event.stopPropagation();
        this.close();
        return;
      }
      case 'Tab': {
        this.close();
        return;
      }
    }

    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      this.onTypeahead(event.key);
    }
  }

  private move(step: 1 | -1): void {
    const next = this.nextEnabled(this.activeIndex(), step);
    if (next >= 0) this.activeIndex.set(next);
    this.scrollActiveIntoView();
  }

  /** Siguiente opción habilitada a partir de `from` en la dirección `step`; -1 si no hay. */
  private nextEnabled(from: number, step: 1 | -1): number {
    const options = this.options();
    for (let i = from + step; i >= 0 && i < options.length; i += step) {
      if (!options[i].disabled) return i;
    }
    return from >= 0 && from < options.length ? from : -1;
  }

  private onTypeahead(char: string): void {
    this.typeahead += char.toLowerCase();
    if (this.typeaheadTimer) clearTimeout(this.typeaheadTimer);
    this.typeaheadTimer = setTimeout(() => (this.typeahead = ''), TYPEAHEAD_RESET_MS);

    const options = this.options();
    const start = Math.max(this.activeIndex(), 0);
    const ordered = [...options.keys()].map((i) => (i + start) % options.length);
    // Una letra repetida recorre las opciones que empiezan igual: se busca desde la siguiente.
    const candidates = this.typeahead.length === 1 ? [...ordered.slice(1), ordered[0]] : ordered;
    const found = candidates.find(
      (i) => !options[i]?.disabled && options[i].label.toLowerCase().startsWith(this.typeahead),
    );
    if (found === undefined) return;

    if (this.isOpen()) {
      this.activeIndex.set(found);
      this.scrollActiveIntoView();
    } else {
      this.choose(found);
    }
  }

  // ---- Fuera del desplegable ----
  onDocumentPointerDown(event: Event): void {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) this.close();
  }

  /** Cualquier scroll (la página o el cuerpo de un modal) cierra el panel, salvo el del propio panel. */
  private readonly onAnyScroll = (event: Event): void => {
    if (this.isOpen() && !this.panel()?.nativeElement.contains(event.target as Node)) this.close();
  };

  // ---- Posición ----
  /**
   * El panel es `fixed` para que no lo recorte un contenedor con scroll (p. ej. el cuerpo de un
   * modal). Se abre hacia abajo y, si no cabe, hacia arriba.
   */
  private computePosition(): PanelPosition {
    const rect = this.trigger()!.nativeElement.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom - PANEL_GAP - VIEWPORT_MARGIN;
    const above = rect.top - PANEL_GAP - VIEWPORT_MARGIN;
    const up = below < PANEL_MAX_HEIGHT && above > below;
    const room = up ? above : below;
    return {
      top: up ? null : rect.bottom + PANEL_GAP,
      bottom: up ? window.innerHeight - rect.top + PANEL_GAP : null,
      left: rect.left,
      width: rect.width,
      maxHeight: Math.max(96, Math.min(PANEL_MAX_HEIGHT, room)),
    };
  }

  private scrollActiveIntoView(): void {
    const index = this.activeIndex();
    if (index < 0) return;
    this.panel()
      ?.nativeElement.querySelector(`#${this.optionId(index)}`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }
}
