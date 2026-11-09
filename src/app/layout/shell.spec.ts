import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { initialAuthState } from '@core/auth/store/auth.state';
import { Workshop } from '@core/workshops';
import { initialWorkshopState } from '@core/workshops/store/workshop.state';
import { MockStore } from '@ngrx/store/testing';
import { WorkshopsActions } from '@core/workshops/store/workshop.actions';
import { provideTestStore } from '../../testing/utils/store';
import { Shell } from './shell';

const workshop = (overrides: Partial<Workshop> = {}): Workshop => ({
  id: 'w1',
  name: 'Taller Pérez',
  address: 'a',
  phone: 'p',
  logoUrl: null,
  capacity: 4,
  minIntakePhotos: 4,
  quoteExpirationDays: 7,
  warrantyDays: 14,
  currency: 'USD',
  timezone: 'America/Guayaquil',
  ...overrides,
});

function render(role: 'owner' | 'advisor' | 'mechanic' | null, active: Workshop | null = null) {
  TestBed.configureTestingModule({
    imports: [Shell],
    providers: [
      provideRouter([]),
      provideTestStore({
        auth: { ...initialAuthState, isAuthenticated: true, activeWorkshopId: 'w1', role },
        workshops: { ...initialWorkshopState, available: active ? [active] : [], active },
      }),
    ],
  });
  const fixture = TestBed.createComponent(Shell);
  return { fixture, element: fixture.nativeElement as HTMLElement };
}

const links = (element: HTMLElement) =>
  Array.from(element.querySelectorAll('a')).map((a) => a.getAttribute('href'));

describe('Shell', () => {
  it('should create', () => {
    expect(render('owner').fixture.componentInstance).toBeTruthy();
  });

  it('shows the settings link to the owner', async () => {
    const { fixture, element } = render('owner');
    await fixture.whenStable();
    expect(links(element)).toContain('/settings');
  });

  it.each(['advisor', 'mechanic'] as const)('hides the settings link from the %s', async (role) => {
    const { fixture, element } = render(role);
    await fixture.whenStable();
    expect(links(element)).not.toContain('/settings');
  });

  describe('workshop identity in the header', () => {
    it('shows the name and the logo', async () => {
      const { fixture, element } = render(
        'owner',
        workshop({ logoUrl: 'https://x.test/logo.png' }),
      );
      await fixture.whenStable();

      expect(element.querySelector('header')?.textContent).toContain('Taller Pérez');
      const img = element.querySelector('header img');
      expect(img?.getAttribute('src')).toBe('https://x.test/logo.png');
      expect(img?.getAttribute('alt')).toBe('Logo de Taller Pérez');
    });

    it('shows the initial of the name when there is no logo', async () => {
      const { fixture, element } = render('owner', workshop());
      await fixture.whenStable();

      expect(element.querySelector('header img')).toBeNull();
      expect(element.querySelector('header [aria-hidden="true"]')?.textContent?.trim()).toBe('T');
    });

    it('falls back to the initial when the image fails to load', async () => {
      const { fixture, element } = render(
        'owner',
        workshop({ logoUrl: 'https://x.test/broken.png' }),
      );
      await fixture.whenStable();

      element.querySelector('header img')?.dispatchEvent(new Event('error'));
      await fixture.whenStable();

      expect(element.querySelector('header img')).toBeNull();
      expect(element.querySelector('header [aria-hidden="true"]')?.textContent?.trim()).toBe('T');
    });

    it('tries the new logo once the workshop is updated after a broken one', async () => {
      const { fixture, element } = render(
        'owner',
        workshop({ logoUrl: 'https://x.test/broken.png' }),
      );
      await fixture.whenStable();
      element.querySelector('header img')?.dispatchEvent(new Event('error'));
      await fixture.whenStable();

      TestBed.inject(MockStore).dispatch(
        WorkshopsActions.updateSuccess({
          workshop: workshop({ logoUrl: 'https://x.test/new.png' }),
        }),
      );
      TestBed.inject(MockStore).setState({
        auth: { ...initialAuthState, isAuthenticated: true, activeWorkshopId: 'w1', role: 'owner' },
        workshops: {
          ...initialWorkshopState,
          available: [workshop({ logoUrl: 'https://x.test/new.png' })],
          active: workshop({ logoUrl: 'https://x.test/new.png' }),
        },
        catalogs: { roles: [] },
      });
      await fixture.whenStable();

      expect(element.querySelector('header img')?.getAttribute('src')).toBe(
        'https://x.test/new.png',
      );
    });
  });
});
