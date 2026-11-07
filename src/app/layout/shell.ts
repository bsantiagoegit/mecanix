import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthFacade } from '@core/auth';
import { WorkshopFacade } from '@core/workshops';
import { ToastContainer } from '@shared/components/toast-container/toast-container';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, ToastContainer],
  templateUrl: './shell.html',
})
export class Shell {
  readonly auth = inject(AuthFacade);
  readonly workshop = inject(WorkshopFacade);

  logout(): void {
    this.auth.logout();
  }
}
