import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, catchError, filter, map, of, switchMap, withLatestFrom } from 'rxjs';

import { AuthActions, AuthService, selectSessionWorkshopId } from '@core/auth';
import { WorkshopService } from '../workshop.service';
import { WorkshopsActions } from './workshop.actions';
import { selectActiveWorkshopId, selectAvailableWorkshops } from './workshop.selectors';

@Injectable()
export class WorkshopEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly service = inject(WorkshopService);
  private readonly authService = inject(AuthService);

  loadOnSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      map(() => WorkshopsActions.loadAvailable()),
    ),
  );

  loadAvailable$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkshopsActions.loadAvailable),
      withLatestFrom(this.store.select(selectSessionWorkshopId)),
      switchMap(([, preferredWorkshopId]) =>
        this.service.listMine().pipe(
          map((workshops) =>
            WorkshopsActions.loadAvailableSuccess({ workshops, preferredWorkshopId }),
          ),
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

  /**
   * Mantiene `auth.activeWorkshopId`/`auth.role` alineados con `workshops.active`:
   * el rol es por taller, así que al cambiar de taller se vuelve a resolver.
   */
  syncSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(WorkshopsActions.loadAvailableSuccess, WorkshopsActions.switchWorkshopSuccess),
      withLatestFrom(
        this.store.select(selectActiveWorkshopId),
        this.store.select(selectSessionWorkshopId),
      ),
      map(([, activeId, sessionId]) => (activeId !== sessionId ? activeId : null)),
      filter((workshopId): workshopId is string => workshopId !== null),
      switchMap((workshopId) =>
        this.authService.roleIn(workshopId).pipe(
          map((role) => AuthActions.setActiveWorkshop({ workshopId, role })),
          catchError(() => EMPTY),
        ),
      ),
    ),
  );
}
