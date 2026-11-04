import { Component, computed, input, output } from '@angular/core';
import { cn } from '../../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  imports: [],
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly fullWidth = input(false);

  readonly clicked = output<MouseEvent>();

  readonly classes = computed(() =>
    cn(
      'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      this.fullWidth() ? 'w-full' : '',
      // Variant
      this.variant() === 'primary' && 'bg-primary-500 text-white hover:bg-primary-600',
      this.variant() === 'secondary' &&
        'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
      this.variant() === 'danger' && 'bg-danger-500 text-white hover:bg-danger-600',
      this.variant() === 'ghost' && 'text-fg hover:bg-neutral-100 dark:hover:bg-neutral-800',
      this.variant() === 'link' && 'text-primary-600 hover:underline px-0',
      // Size
      this.size() === 'sm' && 'px-3 py-1.5 text-xs',
      this.size() === 'md' && 'px-4 py-2 text-sm',
      this.size() === 'lg' && 'px-6 py-3 text-base',
    ),
  );

  onClick(event: MouseEvent): void {
    if (this.disabled() || this.loading()) {
      event.preventDefault();
      return;
    }
    this.clicked.emit(event);
  }
}
