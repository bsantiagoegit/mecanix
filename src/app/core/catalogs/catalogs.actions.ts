import { CatalogRole } from '@core/catalogs';
import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const CatalogsActions = createActionGroup({
  source: 'Catalogs',
  events: {
    'Load Catalogs': emptyProps(),
    'Load Roles Success': props<{ roles: CatalogRole[] }>(),
    'Load Catalogs Failure': props<{ error: string }>(),
  },
});
