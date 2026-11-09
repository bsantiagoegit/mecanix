import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { Workshop } from '../workshop.model';
import { WorkshopsActions } from './workshop.actions';
import {
  selectActiveWorkshop,
  selectActiveWorkshopId,
  selectAvailableWorkshops,
  selectWorkshopsError,
  selectWorkshopsLoading,
} from './workshop.selectors';

/** Facade sobre el slice NgRx `workshops` (D-STATE-12). */
@Injectable({ providedIn: 'root' })
export class WorkshopFacade {
  private readonly store = inject(Store);

  readonly available = this.store.selectSignal(selectAvailableWorkshops);
  readonly active = this.store.selectSignal(selectActiveWorkshop);
  readonly activeId = this.store.selectSignal(selectActiveWorkshopId);
  readonly isLoading = this.store.selectSignal(selectWorkshopsLoading);
  readonly error = this.store.selectSignal(selectWorkshopsError);

  loadAvailable(): void {
    this.store.dispatch(WorkshopsActions.loadAvailable());
  }

  /** Refleja en el store un taller ya guardado (p. ej. tras editar su configuración). */
  applyUpdate(workshop: Workshop): void {
    this.store.dispatch(WorkshopsActions.updateSuccess({ workshop }));
  }

  switchTo(workshopId: string): void {
    this.store.dispatch(WorkshopsActions.switchWorkshop({ workshopId }));
  }
}
