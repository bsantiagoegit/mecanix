import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  it('should keep an action toast until dismissed', () => {
    vi.useFakeTimers();
    const service = TestBed.inject(ToastService);
    const run = vi.fn();

    service.withAction('Update available', { label: 'Reload', run });
    vi.advanceTimersByTime(60_000);

    const [toast] = service.toasts();
    expect(toast.action?.label).toBe('Reload');
    service.dismiss(toast.id);
    expect(service.toasts()).toEqual([]);
    vi.useRealTimers();
  });
});
