import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Workshop } from './workshop.models';

export const WorkshopsActions = createActionGroup({
  source: 'Workshops',
  events: {
    'Load Available': emptyProps(),
    'Load Available Success': props<{ workshops: Workshop[] }>(),
    'Load Available Failure': props<{ error: string }>(),

    'Switch Workshop': props<{ workshopId: string }>(),
    'Switch Workshop Success': props<{ workshop: Workshop }>(),
    'Switch Workshop Failure': props<{ error: string }>(),
  },
});
