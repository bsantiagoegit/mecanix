import { Injectable, signal } from '@angular/core';
import { Toast, ToastAction, ToastType } from '../models/toast.model';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = signal<Toast[]>([]);
  readonly toasts = this._toasts.asReadonly();

  success(message: string, duration = 3000): void {
    this.show('success', message, duration);
  }

  error(message: string, duration = 5000): void {
    this.show('error', message, duration);
  }

  warning(message: string, duration = 4000): void {
    this.show('warning', message, duration);
  }

  info(message: string, duration = 3000): void {
    this.show('info', message, duration);
  }

  /** Persistent toast with a button; it stays until the user acts or dismisses it. */
  withAction(message: string, action: ToastAction): void {
    this.show('info', message, 0, action);
  }

  dismiss(id: string): void {
    this._toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  private show(type: ToastType, message: string, duration: number, action?: ToastAction): void {
    const id = crypto.randomUUID();
    this._toasts.update((toasts) => [...toasts, { id, type, message, duration, action }]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }
}
