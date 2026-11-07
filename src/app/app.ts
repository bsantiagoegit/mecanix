import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UpdateService } from './core/pwa';
import { ThemeService } from './core/theme';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly theme = inject(ThemeService);
  private readonly update = inject(UpdateService);

  ngOnInit(): void {
    this.theme.init();
    this.update.init();
  }
}
