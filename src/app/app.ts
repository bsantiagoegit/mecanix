import { Component, OnInit, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UpdateService } from '@core/pwa';
import { ThemeService } from '@core/theme';
import { ToastService } from '@shared/services/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly theme = inject(ThemeService);
  private readonly update = inject(UpdateService);
  private readonly toast = inject(ToastService);

  constructor() {
    effect(() => {
      if (this.update.updateReady()) {
        this.toast.withAction('Hay una actualización disponible.', {
          label: 'Recargar',
          run: () =>
            this.update
              .applyUpdate()
              .catch(() => this.toast.error('No se pudo actualizar. Recarga manualmente.')),
        });
      }
    });
  }

  ngOnInit(): void {
    this.theme.init();
    this.update.init();
  }
}
