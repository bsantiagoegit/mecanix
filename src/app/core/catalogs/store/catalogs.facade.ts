import { Injectable, inject } from '@angular/core';
import { CatalogsActions } from './catalogs.actions';
import { selectCatalogsError, selectCatalogsLoading, selectRoles } from './catalogs.selectors';
import { Store } from '@ngrx/store';

/** Facade sobre el slice NgRx `catalogs` (D-STATE-13). */
@Injectable({ providedIn: 'root' })
export class CatalogsFacade {
  private readonly store = inject(Store);

  readonly roles = this.store.selectSignal(selectRoles);
  readonly isLoading = this.store.selectSignal(selectCatalogsLoading);
  readonly error = this.store.selectSignal(selectCatalogsError);

  load(): void {
    this.store.dispatch(CatalogsActions.loadCatalogs());
  }
}
