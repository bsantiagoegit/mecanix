import { Component, computed, forwardRef, input, model, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

@Component({
  selector: 'app-input',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  templateUrl: './input.html',
})
export class InputComponent implements ControlValueAccessor {
  readonly inputId = `input-${nextId++}`;

  readonly type = input<'text' | 'email' | 'tel' | 'number' | 'password' | 'search'>('text');
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly autocomplete = input<string>('off');
  readonly revealable = input(false);

  readonly value = model<string>('');

  readonly revealed = signal(false);

  readonly inputType = computed(() => (this.revealed() ? 'text' : this.type()));

  private onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  readonly inputClasses = computed(() => {
    const base =
      'h-11 w-full px-3 rounded-md border bg-surface text-base text-fg transition-colors ' +
      'placeholder:text-fg-muted focus:outline-none focus:ring-2 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed';
    return this.error()
      ? `${base} border-danger-500 focus:border-danger-500 focus:ring-danger-500/20`
      : `${base} border-border focus:border-primary-500 focus:ring-primary-500/20`;
  });

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  toggleReveal(): void {
    this.revealed.update((v) => !v);
  }

  writeValue(value: string): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
}
