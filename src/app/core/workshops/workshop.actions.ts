import { Workshop } from '@core/models';
import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const WorkshopsActions = createActionGroup({
  source: 'Workshops',
  events: {
    'Load Available': emptyProps(),
    'Load Available Success': props<{
      workshops: Workshop[];
      preferredWorkshopId: string | null;
    }>(),
    'Load Available Failure': props<{ error: string }>(),

    'Switch Workshop': props<{ workshopId: string }>(),
    'Switch Workshop Success': props<{ workshop: Workshop }>(),
    'Switch Workshop Failure': props<{ error: string }>(),
  },
});
