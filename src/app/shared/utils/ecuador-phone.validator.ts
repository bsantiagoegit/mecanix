import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Por qué un celular no es válido. */
export type EcuadorMobileProblem = 'format' | 'length' | 'prefix';

/** Un celular de Ecuador son 10 dígitos y empieza con 09 (`09XXXXXXXX`). */
const MOBILE_LENGTH = 10;
const MOBILE_PREFIX = '09';

/**
 * Comprueba un celular ecuatoriano escrito a nivel nacional: solo dígitos, 10 en total y
 * empezando con `09`. Devuelve el problema, o `null` si es válido. No admite espacios, guiones ni
 * el prefijo internacional (`+593`), ni teléfonos fijos.
 */
export function checkEcuadorMobile(value: string): EcuadorMobileProblem | null {
  if (!/^\d+$/.test(value)) return 'format';
  if (value.length !== MOBILE_LENGTH) return 'length';
  if (!value.startsWith(MOBILE_PREFIX)) return 'prefix';
  return null;
}

export function isValidEcuadorMobile(value: string): boolean {
  return checkEcuadorMobile(value) === null;
}

/**
 * Validador de celular ecuatoriano. Usa la clave de error `ecuadorMobile`, cuyo valor es el
 * problema (`format`, `length` o `prefix`). Vacío es válido: combinar con `Validators.required`.
 */
export function ecuadorMobileValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  const problem = checkEcuadorMobile(String(value));
  return problem ? { ecuadorMobile: problem } : null;
}
