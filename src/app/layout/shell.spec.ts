import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { initialAuthState } from '@core/auth/store/auth.state';
import { provideTestStore } from '../../testing/utils/store';
import { Shell } from './shell';

function render(role: 'owner' | 'advisor' | 'mechanic' | null) {
  TestBed.configureTestingModule({
    imports: [Shell],
    providers: [
      provideRouter([]),
      provideTestStore({
        auth: { ...initialAuthState, isAuthenticated: true, activeWorkshopId: 'w1', role },
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
});
