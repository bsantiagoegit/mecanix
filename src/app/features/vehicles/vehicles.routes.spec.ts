import { VEHICLE_ROUTES } from './vehicles.routes';

describe('VEHICLE_ROUTES', () => {
  it('has only the list, which every role with a workshop can see', () => {
    expect(VEHICLE_ROUTES.map((route) => route.path)).toEqual(['']);
    expect(VEHICLE_ROUTES[0].canActivate).toBeUndefined();
  });

  it('has no page to register or edit', () => {
    const paths = VEHICLE_ROUTES.map((route) => route.path);
    expect(paths).not.toContain('new');
    expect(paths).not.toContain(':id/edit');
  });
});
