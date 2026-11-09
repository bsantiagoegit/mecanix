import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFacade } from '@core/auth';
import { WorkshopCreationError, WorkshopCreationReason } from '@core/errors';
import { WorkshopService } from '@core/workshops';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { Input } from '@shared/components/input/input';
import { ToastService } from '@shared/services/toast.service';
import { trimOnChange } from '@shared/utils/trim-on-change';
import { firstValueFrom } from 'rxjs';
import { LogoPicker, LogoSelection } from '../../components/logo-picker/logo-picker';
import { WorkshopSettingsService } from '../../services/workshop-settings.service';

const PHONE_PATTERN = /^[0-9+()\s-]{7,20}$/;

const ERROR_MESSAGES: Record<WorkshopCreationReason, string> = {
  user_already_has_workshop: 'Tu cuenta ya pertenece a un taller.',
  email_not_confirmed: 'Confirma tu correo antes de crear un taller.',
  invalid_workshop_data: 'Revisa los datos del taller.',
  not_authenticated: 'Tu sesión expiró. Inicia sesión de nuevo.',
};

/** UC-WS-08: el usuario recién registrado crea su taller y queda como `owner`. */
@Component({
  selector: 'app-create-workshop-page',
  imports: [ReactiveFormsModule, Button, Card, Input, LogoPicker],
  templateUrl: './create-workshop-page.html',
})
export class CreateWorkshopPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly workshops = inject(WorkshopService);
  private readonly settings = inject(WorkshopSettingsService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthFacade);

  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  /** Logo opcional que el usuario eligió (lo informa el selector). */
  readonly logo = signal<LogoSelection>({ file: null, remove: false });

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    address: ['', [Validators.required, Validators.maxLength(200)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
  });

  constructor() {
    trimOnChange(this.form.controls.name);
    trimOnChange(this.form.controls.address);
    trimOnChange(this.form.controls.phone);

    // Al resolverse la sesión con taller (recién creado) se entra a la app.
    effect(() => {
      if (this.auth.hasWorkshop()) {
        void this.router.navigateByUrl('/dashboard');
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { name, address, phone } = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.error.set(null);

    let workshopId: string;
    try {
      workshopId = await firstValueFrom(
        this.workshops.create({ name: name!, address: address!, phone: phone! }),
      );
    } catch (err) {
      this.isSubmitting.set(false);
      const reason = err instanceof WorkshopCreationError ? err.reason : null;
      this.error.set(
        reason ? ERROR_MESSAGES[reason] : 'No se pudo crear el taller. Inténtalo de nuevo.',
      );
      // Ya tenía taller (p. ej. lo creó desde otra pestaña): se sincroniza la sesión.
      if (reason === 'user_already_has_workshop') this.auth.restoreSession();
      return;
    }

    // El logo es opcional y solo se puede subir ahora que el usuario es `owner`. El taller ya
    // existe: si el logo falla no se bloquea el alta, se avisa y se puede subir desde la configuración.
    const file = this.logo().file;
    if (file) {
      try {
        await this.settings.attachLogo(workshopId, file);
      } catch {
        this.toast.warning(
          'Taller creado, pero no se pudo subir el logo. Puedes hacerlo desde Configuración.',
          8000,
        );
      }
    }

    // La membresía nueva se refleja volviendo a resolver la sesión.
    this.auth.restoreSession();
  }

  logout(): void {
    this.auth.logout();
  }

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.touched || !control.errors) return '';
    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['maxlength']) return 'Es demasiado largo';
    if (control.errors['pattern'])
      return 'Teléfono inválido (7 a 20 dígitos, puede incluir + ( ) -)';
    return '';
  }
}
