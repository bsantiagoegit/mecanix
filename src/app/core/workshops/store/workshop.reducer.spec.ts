import { Workshop } from '../workshop.model';
import { WorkshopsActions } from './workshop.actions';
import { workshopReducer } from './workshop.reducer';
import { initialWorkshopState } from './workshop.state';

const workshop = (id: string, name: string): Workshop => ({
  id,
  name,
  address: 'a',
  phone: 'p',
  logoUrl: null,
  capacity: 4,
  minIntakePhotos: 4,
  quoteExpirationDays: 7,
  warrantyDays: 14,
  currency: 'USD',
  timezone: 'America/Guayaquil',
});

describe('workshopReducer updateSuccess', () => {
  it('replaces the workshop in the list and the active one', () => {
    const w1 = workshop('w1', 'Viejo');
    const w2 = workshop('w2', 'Otro');
    const state = { ...initialWorkshopState, available: [w1, w2], active: w1 };

    const next = workshopReducer(
      state,
      WorkshopsActions.updateSuccess({ workshop: { ...w1, name: 'Nuevo', logoUrl: 'u' } }),
    );

    expect(next.active).toMatchObject({ id: 'w1', name: 'Nuevo', logoUrl: 'u' });
    expect(next.available.map((w) => w.name)).toEqual(['Nuevo', 'Otro']);
  });

  it('leaves the active workshop alone when another one is updated', () => {
    const w1 = workshop('w1', 'Uno');
    const w2 = workshop('w2', 'Dos');
    const state = { ...initialWorkshopState, available: [w1, w2], active: w1 };

    const next = workshopReducer(
      state,
      WorkshopsActions.updateSuccess({ workshop: { ...w2, name: 'Dos!' } }),
    );

    expect(next.active).toBe(w1);
    expect(next.available[1].name).toBe('Dos!');
  });
});
