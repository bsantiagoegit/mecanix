import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly swUpdate = inject(SwUpdate);
  // private readonly toast = inject(ToastService); // Fase 2

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => {
        // TODO: mostrar toast "Hay una actualización disponible"
        const confirmed = confirm('Hay una actualización disponible. ¿Recargar?');
        if (confirmed) {
          this.swUpdate.activateUpdate().then(() => location.reload());
        }
      });

    setInterval(() => this.swUpdate.checkForUpdate(), 6 * 60 * 60 * 1000);
  }
}
