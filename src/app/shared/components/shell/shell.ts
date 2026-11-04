import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from '../../../core/auth';
import { WorkshopStore } from '../../../core/workshops';
import { Toast } from '../toast/toast';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, Toast],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  readonly auth = inject(AuthStore);
  readonly workshop = inject(WorkshopStore);

  logout(): void {
    this.auth.logout();
  }
}
