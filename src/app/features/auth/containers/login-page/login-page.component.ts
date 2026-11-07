import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonComponent, CardComponent, InputComponent } from '@shared/components';
import { ToastService } from '@shared/services';
import { AuthStore } from '../../../../core/auth';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, ButtonComponent, CardComponent, InputComponent],
  templateUrl: './login-page.html',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthStore);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password } = this.form.getRawValue();
    this.auth.login(email!, password!);
  }

  loginWithGoogle(): void {
    // TODO: implementar cuando AuthService tenga signInWithGoogle
    this.toast.info('Login con Google próximamente');
  }

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.touched || !control.errors) return '';
    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['email']) return 'Email inválido';
    return '';
  }

  returnUrl(): string {
    return this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
  }
}
