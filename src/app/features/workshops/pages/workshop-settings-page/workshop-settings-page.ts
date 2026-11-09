import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
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
import {
  LogoError,
  LogoErrorReason,
  WorkshopLogoService,
} from '../../services/workshop-logo.service';
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

const LOGO_MESSAGES: Record<LogoErrorReason, string> = {
  invalid_type: 'El logo debe ser una imagen JPG, PNG o WebP.',
  too_large: 'El logo es demasiado pesado (máximo 5 MB).',
  upload_failed: 'No se pudo subir el logo. Inténtalo de nuevo.',
};

/** UC-WS-02: el `owner` edita los datos del taller, su logo y las reglas operativas. */
@Component({
  selector: 'app-workshop-settings-page',
  imports: [ReactiveFormsModule, Button, Card, Input],
  templateUrl: './workshop-settings-page.html',
})
export class WorkshopSettingsPage implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(WorkshopSettingsService);
  private readonly logos = inject(WorkshopLogoService);
  private readonly toast = inject(ToastService);
  readonly workshops = inject(WorkshopFacade);

  readonly isSaving = signal(false);
  readonly error = signal<string | null>(null);
  readonly logoError = signal<string | null>(null);

  /** Logo nuevo elegido (sin subir todavía) y su vista previa. */
  readonly newLogo = signal<File | null>(null);
  readonly removeLogo = signal(false);
  private previewUrl: string | null = null;
  readonly logoPreview = signal<string | null>(null);

  readonly currentLogo = computed(() => this.workshops.active()?.logoUrl ?? null);
  /** Lo que se muestra: la vista previa del archivo nuevo, el logo actual o nada. */
  readonly shownLogo = computed(() =>
    this.removeLogo() ? null : (this.logoPreview() ?? this.currentLogo()),
  );

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

  readonly hasLogoChange = computed(() => this.newLogo() !== null || this.removeLogo());

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

  ngOnDestroy(): void {
    this.revokePreview();
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    const invalid = this.logos.validate(file);
    if (invalid) {
      this.logoError.set(LOGO_MESSAGES[invalid]);
      return;
    }
    this.logoError.set(null);
    this.revokePreview();
    this.previewUrl = URL.createObjectURL(file);
    this.logoPreview.set(this.previewUrl);
    this.newLogo.set(file);
    this.removeLogo.set(false);
  }

  onRemoveLogo(): void {
    this.revokePreview();
    this.logoPreview.set(null);
    this.newLogo.set(null);
    this.logoError.set(null);
    this.removeLogo.set(this.currentLogo() !== null);
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
        { file: this.newLogo(), remove: this.removeLogo() },
      );
      this.workshops.applyUpdate(updated);
      this.resetLogoSelection();
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

  private resetLogoSelection(): void {
    this.revokePreview();
    this.logoPreview.set(null);
    this.newLogo.set(null);
    this.removeLogo.set(false);
  }

  private revokePreview(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }

  private messageFor(err: unknown): string {
    if (err instanceof LogoError) return LOGO_MESSAGES[err.reason];
    if (err instanceof AuthorizationError)
      return 'Solo el dueño del taller puede cambiar la configuración.';
    return 'No se pudieron guardar los cambios. Inténtalo de nuevo.';
  }
}
