import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs/operators';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/**
 * Detects new app versions. It does not show UI (core/ cannot depend on shared/):
 * whoever composes the app observes `updateReady` and offers `applyUpdate()` to the user.
 */
@Injectable({ providedIn: 'root' })
export class UpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly _updateReady = signal(false);

  readonly updateReady = this._updateReady.asReadonly();

  init(): void {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(() => this._updateReady.set(true));

    setInterval(() => this.swUpdate.checkForUpdate(), CHECK_INTERVAL_MS);
  }

  /** Activates the new version and reloads. Rejects if activation fails. */
  async applyUpdate(): Promise<void> {
    await this.swUpdate.activateUpdate();
    location.reload();
  }
}
