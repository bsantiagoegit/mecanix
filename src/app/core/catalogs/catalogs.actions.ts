import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Role } from './catalogs.models';

export const CatalogsActions = createActionGroup({
  source: 'Catalogs',
  events: {
    'Load Catalogs': emptyProps(),
    'Load Roles Success': props<{ roles: Role[] }>(),
    'Load Catalogs Failure': props<{ error: string }>(),
  },
});
