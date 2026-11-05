import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthStore } from '../../../core/auth';
import { WorkshopStore } from '../../../core/workshops';
import { ToastComponent } from '../toast/toast.component';

@Component({
  standalone: true,
  selector: 'app-shell',
  imports: [RouterOutlet, ToastComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class ShellComponent {
  readonly auth = inject(AuthStore);
  readonly workshop = inject(WorkshopStore);

  logout(): void {
    this.auth.logout();
  }
}
