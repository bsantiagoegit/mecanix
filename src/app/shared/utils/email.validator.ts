import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

/** Algo@dominio.ext, con extensión de al menos 2 letras. Angular acepta `a@b`, esto no. */
const EMAIL_WITH_DOMAIN = /^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/;

/**
 * Validador de email: el de Angular (formato, longitudes) más un dominio con extensión
 * (`ana@example` no es válido). Usa la clave de error `email`. Vacío es válido: combinar
 * con `Validators.required`.
 */
export function emailValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  const angular = Validators.email(control);
  if (angular) return angular;
  return EMAIL_WITH_DOMAIN.test(value) ? null : { email: true };
}
