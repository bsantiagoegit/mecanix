import { CUSTOMER_ROUTES } from './customers.routes';

describe('CUSTOMER_ROUTES', () => {
  const byPath = (path: string) => CUSTOMER_ROUTES.find((r) => r.path === path);

  it('lets every role with a workshop see the list', () => {
    expect(byPath('')?.canActivate).toBeUndefined();
  });

  it.each(['new', ':id/edit'])('guards "%s" with a role guard', (path) => {
    expect(byPath(path)?.canActivate).toHaveLength(1);
  });

  it('puts "new" before ":id/edit" so it is never read as an id', () => {
    const paths = CUSTOMER_ROUTES.map((r) => r.path);
    expect(paths.indexOf('new')).toBeLessThan(paths.indexOf(':id/edit'));
  });
});
