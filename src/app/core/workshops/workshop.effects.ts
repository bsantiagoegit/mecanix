import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';

import { WorkshopsActions } from './workshop.actions';
import { selectAvailableWorkshops } from './workshop.selectors';
import { WorkshopService } from './workshop.service';

@Injectable()
export class WorkshopEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly service = inject(WorkshopService);

  loadAvailable$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkshopsActions.loadAvailable),
      switchMap(() =>
        this.service.listMine().pipe(
          map((workshops) => WorkshopsActions.loadAvailableSuccess({ workshops })),
          catchError((error) =>
            of(WorkshopsActions.loadAvailableFailure({ error: error.message })),
          ),
        ),
      ),
    ),
  );

  switchWorkshop$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkshopsActions.switchWorkshop),
      withLatestFrom(this.store.select(selectAvailableWorkshops)),
      map(([{ workshopId }, available]) => {
        const workshop = available.find((w) => w.id === workshopId);
        return workshop
          ? WorkshopsActions.switchWorkshopSuccess({ workshop })
          : WorkshopsActions.switchWorkshopFailure({ error: `Taller ${workshopId} no encontrado` });
      }),
    ),
  );
}
