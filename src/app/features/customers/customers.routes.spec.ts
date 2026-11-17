import { CUSTOMER_ROUTES } from './customers.routes';

describe('CUSTOMER_ROUTES', () => {
  it('has the list and the detail, which every role with a workshop can see', () => {
    expect(CUSTOMER_ROUTES.map((route) => route.path)).toEqual(['', ':id']);
    for (const route of CUSTOMER_ROUTES) expect(route.canActivate).toBeUndefined();
  });

  it('has no page to register or edit: they are a modal of the list and the detail', () => {
    const paths = CUSTOMER_ROUTES.map((route) => route.path);
    expect(paths).not.toContain('new');
    expect(paths).not.toContain(':id/edit');
  });
});
