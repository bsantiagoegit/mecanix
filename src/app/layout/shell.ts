import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthFacade } from '@core/auth';
import { WorkshopFacade } from '@core/workshops';
import { ToastContainer } from '@shared/components/toast-container/toast-container';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastContainer],
  templateUrl: './shell.html',
})
export class Shell {
  readonly auth = inject(AuthFacade);
  readonly workshop = inject(WorkshopFacade);

  /** URL del logo que no se pudo cargar: se muestra la inicial en su lugar. */
  private readonly failedLogo = signal<string | null>(null);

  readonly logoUrl = computed(() => {
    const url = this.workshop.active()?.logoUrl ?? null;
    return url !== null && url !== this.failedLogo() ? url : null;
  });

  readonly initial = computed(() =>
    (this.workshop.active()?.name ?? '').trim().charAt(0).toUpperCase(),
  );

  onLogoError(): void {
    this.failedLogo.set(this.workshop.active()?.logoUrl ?? null);
  }

  logout(): void {
    this.auth.logout();
  }
}
