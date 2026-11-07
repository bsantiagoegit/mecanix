import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { initialAuthState } from '@core/auth/store/auth.state';
import { provideTestStore } from '../../../../../testing/utils/store';
import { LoginPage } from './login-page';

function setup(options: { auth?: Partial<typeof initialAuthState>; returnUrl?: string } = {}) {
  TestBed.configureTestingModule({
    imports: [LoginPage],
    providers: [
      provideRouter([]),
      provideTestStore({ auth: { ...initialAuthState, ...options.auth } }),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(
              options.returnUrl ? { returnUrl: options.returnUrl } : {},
            ),
          },
        },
      },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
  const fixture = TestBed.createComponent(LoginPage);
  return { fixture, navigate, element: fixture.nativeElement as HTMLElement };
}

describe('LoginPage', () => {
  it('should create', () => {
    expect(setup().fixture.componentInstance).toBeTruthy();
  });

  it('does not navigate while there is no session', async () => {
    const { fixture, navigate } = setup();
    await fixture.whenStable();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates to the dashboard once authenticated', async () => {
    const { fixture, navigate } = setup({ auth: { isAuthenticated: true } });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/dashboard');
  });

  it('goes back to the requested internal route', async () => {
    const { fixture, navigate } = setup({
      auth: { isAuthenticated: true },
      returnUrl: '/work-orders/42',
    });
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/work-orders/42');
  });

  it.each(['https://evil.com', '//evil.com', 'javascript:alert(1)'])(
    'ignores the non-internal returnUrl %s',
    async (returnUrl) => {
      const { fixture, navigate } = setup({ auth: { isAuthenticated: true }, returnUrl });
      await fixture.whenStable();
      expect(navigate).toHaveBeenCalledWith('/dashboard');
    },
  );

  it('shows the authentication error', async () => {
    const { fixture, element } = setup({ auth: { error: 'Email o contraseña incorrectos.' } });
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Email o contraseña incorrectos.',
    );
  });

  it('links to register and forgot-password', async () => {
    const { fixture, element } = setup();
    await fixture.whenStable();
    const hrefs = Array.from(element.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/auth/register', '/auth/forgot-password']));
  });
});
