import { Component, effect, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthFacade, AuthService } from '@core/auth';
import { PasswordRecoveryError } from '@core/errors';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { Input } from '@shared/components/input/input';
import { ToastService } from '@shared/services/toast.service';
import { firstValueFrom } from 'rxjs';

/** Debe coincidir con `minimum_password_length` de supabase/config.toml. */
const MIN_PASSWORD_LENGTH = 6;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

/** `checking`: aún se comprueba el enlace · `ready`: se puede elegir la contraseña · `invalid`: enlace caducado o usado. */
type LinkState = 'checking' | 'ready' | 'invalid';

/**
 * UC-AUTH-03 (2/2): el enlace del correo abre esta pantalla con una sesión de recuperación;
 * el usuario elige su contraseña nueva y entra a la app.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, Button, Card, Input],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthFacade);

  readonly linkState = signal<LinkState>('checking');
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);
  /** La contraseña ya se cambió y se está resolviendo la sesión para entrar. */
  private readonly done = signal(false);

  readonly form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    void this.checkLink();

    // Una vez cambiada la contraseña y resuelta la sesión se entra a la app; los guards
    // llevan a quien no tenga taller a crearlo o a aceptar su invitación.
    effect(() => {
      if (this.done() && this.auth.isAuthenticated()) {
        void this.router.navigateByUrl('/dashboard');
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.authService.recoverPassword(this.form.getRawValue().password!));
    } catch (err) {
      this.isSubmitting.set(false);
      if (err instanceof PasswordRecoveryError && err.reason === 'no_session') {
        this.linkState.set('invalid');
        return;
      }
      this.error.set(this.messageFor(err));
      return;
    }
    this.toast.success('Contraseña actualizada');
    this.done.set(true);
    this.auth.restoreSession();
  }

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.touched) return '';
    if (control.errors?.['required']) return 'Este campo es obligatorio';
    if (control.errors?.['minlength']) return `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
    if (field === 'confirmPassword' && this.form.errors?.['passwordMismatch']) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }

  /** El cliente de Supabase procesa el enlace al arrancar: sin sesión, el enlace no sirve. */
  private async checkLink(): Promise<void> {
    try {
      const hasSession = await firstValueFrom(this.authService.hasSession());
      this.linkState.set(hasSession ? 'ready' : 'invalid');
    } catch {
      this.linkState.set('invalid');
    }
  }

  private messageFor(err: unknown): string {
    if (err instanceof PasswordRecoveryError) {
      if (err.reason === 'same_password') return 'Elige una contraseña distinta a la actual.';
      if (err.reason === 'weak_password') {
        return 'La contraseña no cumple los requisitos de seguridad.';
      }
    }
    return 'No se pudo cambiar la contraseña. Inténtalo de nuevo.';
  }
}
