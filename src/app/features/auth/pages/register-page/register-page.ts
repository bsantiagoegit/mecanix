import { Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthFacade } from '@core/auth';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { Input } from '@shared/components/input/input';
import { emailValidator } from '@shared/utils/email.validator';
import { trimOnChange } from '@shared/utils/trim-on-change';

/** Debe coincidir con `minimum_password_length` de supabase/config.toml. */
const MIN_PASSWORD_LENGTH = 6;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink, Button, Card, Input],
  templateUrl: './register-page.html',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthFacade);

  readonly form = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, emailValidator]],
      password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  constructor() {
    // Un error de otra pantalla (p. ej. un login fallido) no debe verse aquí.
    this.auth.clearError();
    trimOnChange(this.form.controls.email);
    trimOnChange(this.form.controls.fullName);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password, fullName } = this.form.getRawValue();
    this.auth.register(email!, password!, fullName!);
  }

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.touched) return '';
    if (control.errors?.['required']) return 'Este campo es obligatorio';
    if (control.errors?.['email']) return 'Email inválido';
    if (control.errors?.['minlength']) {
      return `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
    }
    if (field === 'confirmPassword' && this.form.errors?.['passwordMismatch']) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }
}
