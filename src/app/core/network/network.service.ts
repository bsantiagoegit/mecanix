import { DestroyRef, Injectable, inject, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NetworkService {
  readonly isOnline = signal(navigator.onLine);

  constructor() {
    const controller = new AbortController();
    const { signal: abortSignal } = controller;

    window.addEventListener('online', () => this.isOnline.set(true), { signal: abortSignal });
    window.addEventListener('offline', () => this.isOnline.set(false), { signal: abortSignal });

    inject(DestroyRef).onDestroy(() => controller.abort());
  }
}
