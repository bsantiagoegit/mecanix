import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '@core/auth';
import { PasswordRecoveryError } from '@core/errors';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { Input } from '@shared/components/input/input';
import { emailValidator } from '@shared/utils/email.validator';
import { trimOnChange } from '@shared/utils/trim-on-change';
import { firstValueFrom } from 'rxjs';

/**
 * UC-AUTH-03 (1/2): pide el correo y envía el enlace para restablecer la contraseña.
 * La respuesta es la misma exista o no la cuenta, para no revelar qué correos están registrados.
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, Button, Card, Input],
  templateUrl: './forgot-password-page.html',
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);
  /** Correo al que se pidió el enlace; no es `null` cuando ya se envió. */
  readonly sentTo = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, emailValidator]],
  });

  constructor() {
    trimOnChange(this.form.controls.email);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const email = this.form.getRawValue().email!;
    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.auth.forgotPassword(email));
      this.sentTo.set(email);
    } catch (err) {
      this.error.set(
        err instanceof PasswordRecoveryError && err.reason === 'rate_limited'
          ? 'Ya pediste un enlace hace poco. Espera unos minutos e inténtalo de nuevo.'
          : 'No se pudo enviar el correo. Inténtalo de nuevo.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  /** Vuelve al formulario para pedir el enlace a otro correo. */
  useAnotherEmail(): void {
    this.sentTo.set(null);
    this.form.reset({ email: '' });
  }

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.touched) return '';
    if (control.errors?.['required']) return 'Este campo es obligatorio';
    if (control.errors?.['email']) return 'Email inválido';
    return '';
  }
}
