import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from '@core/auth';
import { WorkshopStore } from '@core/workshops';
import { ToastContainer } from '@shared/components/toast-container/toast-container';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, ToastContainer],
  templateUrl: './shell.html',
})
export class Shell {
  readonly auth = inject(AuthStore);
  readonly workshop = inject(WorkshopStore);

  logout(): void {
    this.auth.logout();
  }
}
