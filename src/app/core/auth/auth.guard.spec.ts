import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, firstValueFrom } from 'rxjs';
import { authGuard, onboardingGuard, roleGuard, workshopGuard } from './auth.guard';
import { initialAuthState } from './store/auth.state';

function run(guard: CanActivateFn, auth: Partial<typeof initialAuthState>, url = '/clientes') {
  TestBed.configureTestingModule({
    providers: [provideMockStore({ initialState: { auth: { ...initialAuthState, ...auth } } })],
  });
  const result = TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  ) as Observable<boolean | UrlTree>;
  return firstValueFrom(result);
}

const withWorkshop = {
  isAuthenticated: true,
  activeWorkshopId: 'w1',
  role: 'owner' as const,
};
const withoutWorkshop = { isAuthenticated: true };

const urlOf = (value: boolean | UrlTree) => TestBed.inject(Router).serializeUrl(value as UrlTree);

describe('session guards', () => {
  describe('authGuard', () => {
    it('lets any authenticated user through, with or without workshop', async () => {
      expect(await run(authGuard, withWorkshop)).toBe(true);
      TestBed.resetTestingModule();
      expect(await run(authGuard, withoutWorkshop)).toBe(true);
    });

    it('sends a visitor to the login keeping the requested url', async () => {
      expect(urlOf(await run(authGuard, {}, '/clientes?x=1'))).toBe(
        '/auth/login?returnUrl=%2Fclientes%3Fx%3D1',
      );
    });
  });

  describe('workshopGuard (app routes)', () => {
    it('lets a user with a workshop through', async () => {
      expect(await run(workshopGuard, withWorkshop)).toBe(true);
    });

    it('sends an authenticated user without workshop to create one', async () => {
      expect(urlOf(await run(workshopGuard, withoutWorkshop))).toBe('/onboarding/create-workshop');
    });

    it('sends a visitor to the login', async () => {
      expect(urlOf(await run(workshopGuard, {}, '/dashboard'))).toBe(
        '/auth/login?returnUrl=%2Fdashboard',
      );
    });

    it('waits for the session to finish loading before deciding', async () => {
      const pending = run(workshopGuard, { ...withWorkshop, isLoading: true });
      const settled = await Promise.race([pending, Promise.resolve('waiting')]);
      expect(settled).toBe('waiting');
    });
  });

  describe('onboardingGuard', () => {
    it('lets a user without workshop through', async () => {
      expect(await run(onboardingGuard, withoutWorkshop)).toBe(true);
    });

    it('sends a user who already has a workshop back to the app', async () => {
      expect(urlOf(await run(onboardingGuard, withWorkshop))).toBe('/');
    });

    it('sends a visitor to the login', async () => {
      expect(urlOf(await run(onboardingGuard, {}, '/onboarding/create-workshop'))).toBe(
        '/auth/login?returnUrl=%2Fonboarding%2Fcreate-workshop',
      );
    });
  });

  describe('roleGuard', () => {
    const owner = { ...withWorkshop, role: 'owner' as const };
    const advisor = { ...withWorkshop, role: 'advisor' as const };

    it('lets a listed role through', async () => {
      expect(await run(roleGuard('owner'), owner)).toBe(true);
      TestBed.resetTestingModule();
      expect(await run(roleGuard('owner', 'advisor'), advisor)).toBe(true);
    });

    it('sends a user with another role back to the app', async () => {
      expect(urlOf(await run(roleGuard('owner'), advisor, '/settings'))).toBe('/');
    });

    it('keeps the session and workshop requirements', async () => {
      expect(urlOf(await run(roleGuard('owner'), {}, '/settings'))).toBe(
        '/auth/login?returnUrl=%2Fsettings',
      );
      TestBed.resetTestingModule();
      expect(urlOf(await run(roleGuard('owner'), withoutWorkshop, '/settings'))).toBe(
        '/onboarding/create-workshop',
      );
    });
  });
});
