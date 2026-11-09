import { Component, effect, inject, signal, viewChild } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthorizationError } from '@core/errors';
import { Workshop, WorkshopFacade } from '@core/workshops';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { Input } from '@shared/components/input/input';
import { ToastService } from '@shared/services/toast.service';
import { trimOnChange } from '@shared/utils/trim-on-change';
import { LOGO_ERROR_MESSAGES, LogoError } from '../../services/workshop-logo.service';
import { LogoPicker, LogoSelection } from '../../components/logo-picker/logo-picker';
import { WorkshopSettingsService } from '../../services/workshop-settings.service';

const PHONE_PATTERN = /^[0-9+()\s-]{7,20}$/;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

function timezoneValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string;
  if (!value) return null;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return null;
  } catch {
    return { timezone: true };
  }
}

/** UC-WS-02: el `owner` edita los datos del taller, su logo y las reglas operativas. */
@Component({
  selector: 'app-workshop-settings-page',
  imports: [ReactiveFormsModule, Button, Card, Input, LogoPicker],
  templateUrl: './workshop-settings-page.html',
})
export class WorkshopSettingsPage {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(WorkshopSettingsService);
  private readonly toast = inject(ToastService);
  readonly workshops = inject(WorkshopFacade);

  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);

  /** Lo que el usuario decidió hacer con el logo (lo informa el selector). */
  readonly logo = signal<LogoSelection>({ file: null, remove: false });
  private readonly picker = viewChild(LogoPicker);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    address: ['', [Validators.required, Validators.maxLength(200)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    capacity: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]*$/)]],
    minIntakePhotos: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]*$/)]],
    quoteExpirationDays: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]*$/)]],
    warrantyDays: ['', [Validators.required, Validators.pattern(/^[1-9][0-9]*$/)]],
    currency: ['', [Validators.required, Validators.pattern(CURRENCY_PATTERN)]],
    timezone: ['', [Validators.required, timezoneValidator]],
  });

  private loadedWorkshopId: string | null = null;

  constructor() {
    for (const field of ['name', 'address', 'phone', 'currency', 'timezone'] as const) {
      trimOnChange(this.form.controls[field]);
    }

    // Carga el formulario con el taller activo, una vez (no pisa lo que el usuario edita).
    effect(() => {
      const workshop = this.workshops.active();
      if (workshop && workshop.id !== this.loadedWorkshopId) {
        this.loadedWorkshopId = workshop.id;
        this.fill(workshop);
      }
    });
  }

  async onSubmit(): Promise<void> {
    const workshop = this.workshops.active();
    if (!workshop) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    this.isSaving.set(true);
    this.error.set(null);
    try {
      const updated = await this.settings.save(
        workshop,
        {
          name: v.name!,
          address: v.address!,
          phone: v.phone!,
          capacity: Number(v.capacity),
          minIntakePhotos: Number(v.minIntakePhotos),
          quoteExpirationDays: Number(v.quoteExpirationDays),
          warrantyDays: Number(v.warrantyDays),
          currency: v.currency!,
          timezone: v.timezone!,
        },
        this.logo(),
      );
      this.workshops.applyUpdate(updated);
      this.picker()?.reset();
      this.logo.set({ file: null, remove: false });
      this.form.markAsPristine();
      this.toast.success('Cambios guardados');
    } catch (err) {
      this.error.set(this.messageFor(err));
    } finally {
      this.isSaving.set(false);
    }
  }

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.touched || !control.errors) return '';
    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['maxlength']) return 'Es demasiado largo';
    if (control.errors['timezone']) return 'Zona horaria inválida (ej. America/Guayaquil)';
    if (control.errors['pattern']) {
      if (field === 'phone') return 'Teléfono inválido (7 a 20 dígitos, puede incluir + ( ) -)';
      if (field === 'currency') return 'Código de 3 letras mayúsculas (ej. USD)';
      return 'Debe ser un número entero mayor que 0';
    }
    return '';
  }

  private fill(workshop: Workshop): void {
    this.form.reset({
      name: workshop.name,
      address: workshop.address,
      phone: workshop.phone,
      capacity: String(workshop.capacity),
      minIntakePhotos: String(workshop.minIntakePhotos),
      quoteExpirationDays: String(workshop.quoteExpirationDays),
      warrantyDays: String(workshop.warrantyDays),
      currency: workshop.currency,
      timezone: workshop.timezone,
    });
  }

  private messageFor(err: unknown): string {
    if (err instanceof LogoError) return LOGO_ERROR_MESSAGES[err.reason];
    if (err instanceof AuthorizationError)
      return 'Solo el dueño del taller puede cambiar la configuración.';
    return 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
  }
}
