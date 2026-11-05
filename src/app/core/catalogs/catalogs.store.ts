import { Injectable, inject } from '@angular/core';
import {
  CatalogsActions,
  selectCatalogsError,
  selectCatalogsLoading,
  selectRoles,
} from '@core/catalogs';
import { Store } from '@ngrx/store';

/** Facade sobre el slice NgRx `catalogs` (D-STATE-13). */
@Injectable({ providedIn: 'root' })
export class CatalogsStore {
  private readonly store = inject(Store);

  readonly roles = this.store.selectSignal(selectRoles);
  readonly isLoading = this.store.selectSignal(selectCatalogsLoading);
  readonly error = this.store.selectSignal(selectCatalogsError);

  load(): void {
    this.store.dispatch(CatalogsActions.loadCatalogs());
  }
}
