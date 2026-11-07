import { Injectable, inject } from '@angular/core';
import { AuthActions } from '@core/auth';
import { CatalogsActions, CatalogsService } from '@core/catalogs';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';

@Injectable()
export class CatalogsEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(CatalogsService);

  loadOnSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      map(() => CatalogsActions.loadCatalogs()),
    ),
  );

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CatalogsActions.loadCatalogs),
      switchMap(() =>
        this.service.listRoles().pipe(
          map((roles) => CatalogsActions.loadRolesSuccess({ roles })),
          catchError((error) => of(CatalogsActions.loadCatalogsFailure({ error: error.message }))),
        ),
      ),
    ),
  );
}
