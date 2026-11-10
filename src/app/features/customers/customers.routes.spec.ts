import { CUSTOMER_ROUTES } from './customers.routes';

describe('CUSTOMER_ROUTES', () => {
  const byPath = (path: string) => CUSTOMER_ROUTES.find((r) => r.path === path);

  it('lets every role with a workshop see the list', () => {
    expect(byPath('')?.canActivate).toBeUndefined();
  });

  it('guards the edit page with a role guard', () => {
    expect(byPath(':id/edit')?.canActivate).toHaveLength(1);
  });

  it('has no page to register: that is a modal of the list', () => {
    expect(byPath('new')).toBeUndefined();
  });
});
