import { CUSTOMER_ROUTES } from './customers.routes';

describe('CUSTOMER_ROUTES', () => {
  it('has only the list, which every role with a workshop can see', () => {
    expect(CUSTOMER_ROUTES).toHaveLength(1);
    expect(CUSTOMER_ROUTES[0].path).toBe('');
    expect(CUSTOMER_ROUTES[0].canActivate).toBeUndefined();
  });

  it('has no page to register or edit: they are a modal of the list', () => {
    const paths = CUSTOMER_ROUTES.map((route) => route.path);
    expect(paths).not.toContain('new');
    expect(paths).not.toContain(':id/edit');
  });
});
