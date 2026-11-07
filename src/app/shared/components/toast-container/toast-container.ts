import { Component, inject } from '@angular/core';
import { ToastAction } from '../../models/toast.model';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  templateUrl: './toast-container.html',
})
export class ToastContainer {
  readonly toastService = inject(ToastService);

  run(id: string, action: ToastAction): void {
    this.toastService.dismiss(id);
    action.run();
  }

  toastClass(type: string): string {
    const base =
      'px-4 py-3 rounded-md shadow-lg text-sm font-medium cursor-pointer transition-opacity';
    const variants: Record<string, string> = {
      success: 'bg-neutral-900 text-white',
      error: 'bg-danger-600 text-white',
      warning: 'bg-warning-600 text-white',
      info: 'bg-neutral-900 text-white',
    };
    return `${base} ${variants[type] ?? variants['info']}`;
  }
}
