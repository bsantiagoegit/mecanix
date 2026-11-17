import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthFacade, AuthService, Role } from '@core/auth';
import { InvitationAcceptError } from '@core/errors';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { Input } from '@shared/components/input/input';
import { PasswordRules } from '@shared/components/password-rules/password-rules';
import { Tooltip } from '@shared/components/tooltip/tooltip';
import {
  passwordErrorMessage,
  passwordValidator,
  passwordsMatchValidator,
} from '@shared/utils/password.validator';
import { firstValueFrom } from 'rxjs';

const ROLE_LABELS: Record<Role, string> = {
  owner: 'dueño',
  advisor: 'asesor',
  mechanic: 'mecánico',
};

/**
 * UC-WS-04: el invitado abrió el enlace del correo (ya tiene sesión) y confirma la invitación:
 * elige su contraseña y entra al taller.
 */
@Component({
  selector: 'app-accept-invitation-page',
  imports: [ReactiveFormsModule, Button, Card, Input, PasswordRules, Tooltip],
  templateUrl: './accept-invitation-page.html',
})
export class AcceptInvitationPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly auth = inject(AuthFacade);

  readonly roleLabels = ROLE_LABELS;
  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * La contraseña ya quedó guardada. Si aceptar falla y el usuario reintenta no se vuelve a
   * guardar: Supabase rechaza fijar la misma contraseña otra vez.
   */
  private passwordSaved = false;

  readonly form = this.fb.group(
    {
      password: ['', [Validators.required, passwordValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatchValidator },
  );

  constructor() {
    // Al resolverse la sesión con taller (invitación aceptada) se entra a la app.
    effect(() => {
      if (this.auth.hasWorkshop()) {
        void this.router.navigateByUrl('/dashboard');
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (this.isSubmitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.error.set(null);

    try {
      if (!this.passwordSaved) {
        await firstValueFrom(this.authService.setPassword(this.form.getRawValue().password!));
        this.passwordSaved = true;
      }
      await firstValueFrom(this.authService.acceptInvitation());
    } catch (err) {
      this.isSubmitting.set(false);
      this.error.set(this.messageFor(err));
      // La invitación ya no existe (la cancelaron o ya se aceptó): se sincroniza la sesión.
      if (err instanceof InvitationAcceptError && err.reason === 'no_pending_invitation') {
        this.auth.restoreSession();
      }
      return;
    }

    // La membresía activa se refleja volviendo a resolver la sesión.
    this.auth.restoreSession();
  }

  logout(): void {
    this.auth.logout();
  }

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.touched) return '';
    if (control.errors?.['required']) return 'Este campo es obligatorio';
    if (control.errors?.['password'])
      return passwordErrorMessage(control.errors['password'].missing);
    if (field === 'confirmPassword' && this.form.errors?.['passwordMismatch']) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }

  private messageFor(err: unknown): string {
    if (err instanceof InvitationAcceptError) {
      return err.reason === 'not_authenticated'
        ? 'Tu sesión expiró. Abre de nuevo el enlace del correo.'
        : 'Esta invitación ya no está disponible. Pídele al dueño del taller que te invite de nuevo.';
    }
    return this.passwordSaved
      ? 'No se pudo aceptar la invitación. Inténtalo de nuevo.'
      : 'No se pudo guardar la contraseña. Prueba con otra más segura.';
  }
}
