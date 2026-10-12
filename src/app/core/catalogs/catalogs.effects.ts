import { Injectable, inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, of, switchMap } from 'rxjs';
import { CatalogsActions } from './catalogs.actions';
import { CatalogsService } from './catalogs.service';

@Injectable()
export class CatalogsEffects {
  private readonly actions$ = inject(Actions);
  private readonly service = inject(CatalogsService);

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
