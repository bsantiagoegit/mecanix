import { Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from '@shared/components/button/button';
import { Input } from '@shared/components/input/input';
import { ecuadorCedulaValidator } from '@shared/utils/ecuador-cedula.validator';
import { ecuadorMobileValidator } from '@shared/utils/ecuador-phone.validator';
import { emailValidator } from '@shared/utils/email.validator';
import { trimOnChange } from '@shared/utils/trim-on-change';
import { CustomerInput, CustomerMatch, normalizeInput } from '../../models/customer.model';

/** Choque de la identificación escrita con la de otro cliente (lo informa quien guarda). */
export interface IdentificationConflict {
  identification: string;
  existing: CustomerMatch | null;
}

/** Otros clientes con el teléfono que se escribió (aviso, no bloquea). */
export interface PhoneWarning {
  phone: string;
  matches: CustomerMatch[];
}

/** Mensaje para cada motivo por el que un celular no es válido (ver `checkEcuadorMobile`). */
const MOBILE_MESSAGES: Record<string, string> = {
  format: 'Escribe solo números, sin espacios ni guiones',
  length: 'El celular debe tener 10 dígitos',
  prefix: 'El celular debe empezar con 09',
};

/** Mensaje para cada motivo por el que una cédula no es válida (ver `checkEcuadorCedula`). */
const CEDULA_MESSAGES: Record<string, string> = {
  format: 'Escribe solo números',
  length: 'La cédula debe tener 10 dígitos',
  province: 'Cédula inválida: los dos primeros dígitos no son una provincia',
  'third-digit': 'Cédula inválida: el tercer dígito debe ser de 0 a 5',
  'check-digit': 'Cédula inválida: el dígito verificador no coincide',
};

const EMPTY: CustomerInput = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  identification: '',
  address: '',
};

/**
 * Formulario de cliente, el mismo para registrar y editar (UC-CUST-01 y 04) y para crearlo
 * "inline" desde otros flujos. Es presentacional: valida y emite los datos; no sabe cómo se
 * guardan ni consulta nada.
 */
@Component({
  selector: 'app-customer-form',
  imports: [ReactiveFormsModule, Button, Input],
  templateUrl: './customer-form.html',
})
export class CustomerForm {
  private readonly fb = inject(FormBuilder);

  /** Datos a editar; sin ellos el formulario empieza vacío (registrar). */
  readonly initial = input<CustomerInput | null>(null);
  readonly submitLabel = input('Guardar');
  readonly isSubmitting = input(false);
  readonly error = input<string | null>(null);
  readonly phoneWarning = input<PhoneWarning | null>(null);
  readonly identificationConflict = input<IdentificationConflict | null>(null);
  /** Muestra un botón "Cancelar" junto al de guardar (p. ej. dentro de un modal). */
  readonly cancellable = input(false);

  readonly submitted = output<CustomerInput>();
  readonly cancelled = output<void>();
  /** El usuario salió del campo de teléfono con un teléfono válido. */
  readonly phoneChecked = output<string>();

  readonly form = this.fb.group({
    firstName: ['', [Validators.required, Validators.maxLength(120)]],
    lastName: ['', [Validators.required, Validators.maxLength(120)]],
    phone: ['', [Validators.required, ecuadorMobileValidator]],
    email: ['', [Validators.required, emailValidator, Validators.maxLength(254)]],
    identification: ['', [Validators.required, ecuadorCedulaValidator]],
    address: ['', [Validators.required, Validators.maxLength(200)]],
  });

  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  /** El aviso de teléfono solo vale mientras el campo siga con el teléfono que se consultó. */
  readonly visiblePhoneWarning = computed(() => {
    const warning = this.phoneWarning();
    const phone = (this.values().phone ?? '').trim();
    return warning && warning.matches.length > 0 && warning.phone === phone ? warning : null;
  });

  /** Igual para la identificación: deja de verse en cuanto el usuario la cambia. */
  readonly visibleConflict = computed(() => {
    const conflict = this.identificationConflict();
    const current = (this.values().identification ?? '').trim();
    return conflict && conflict.identification === current ? conflict : null;
  });

  constructor() {
    for (const field of [
      'firstName',
      'lastName',
      'phone',
      'email',
      'identification',
      'address',
    ] as const) {
      trimOnChange(this.form.controls[field]);
    }

    effect(() => {
      const initial = this.initial();
      untracked(() => {
        const base = initial ?? EMPTY;
        this.form.reset({
          firstName: base.firstName,
          lastName: base.lastName,
          phone: base.phone,
          email: base.email,
          identification: base.identification,
          address: base.address,
        });
      });
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(normalizeInput(this.form.getRawValue() as CustomerInput));
  }

  /** Al salir del teléfono, si es válido, se pide comprobar si ya hay otros clientes con él. */
  onPhoneFocusOut(): void {
    const control = this.form.controls.phone;
    if (control.valid && control.value) this.phoneChecked.emit(control.value.trim());
  }

  fieldError(field: string): string {
    if (field === 'identification' && this.visibleConflict()) {
      return 'Ya existe un cliente con esta cédula';
    }
    const control = this.form.get(field);
    if (!control?.touched || !control.errors) return '';
    const errors = control.errors;
    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['maxlength']) return 'Es demasiado largo';
    if (errors['email']) return 'Email inválido';
    if (errors['ecuadorMobile']) return MOBILE_MESSAGES[errors['ecuadorMobile'] as string] ?? '';
    if (errors['cedula']) return CEDULA_MESSAGES[errors['cedula'] as string] ?? '';
    return '';
  }
}
