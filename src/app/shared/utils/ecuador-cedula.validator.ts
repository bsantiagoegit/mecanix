import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Por qué una cédula no es válida. */
export type EcuadorCedulaProblem = 'format' | 'length' | 'province' | 'third-digit' | 'check-digit';

const CEDULA_LENGTH = 10;
/** Coeficientes del Módulo 10 para los 9 primeros dígitos. */
const COEFFICIENTS = [2, 1, 2, 1, 2, 1, 2, 1, 2];
/** Provincias 01 a 24, y 30 para ecuatorianos registrados en el exterior. */
const LAST_PROVINCE = 24;
const ABROAD_PROVINCE = 30;
/** El tercer dígito de una persona natural es de 0 a 5 (6 y 9 son sociedades y entidades públicas). */
const MAX_THIRD_DIGIT = 5;

/**
 * Comprueba una cédula ecuatoriana de 10 dígitos con el algoritmo Módulo 10. Devuelve el problema,
 * o `null` si es válida:
 *
 * 1. Solo dígitos y exactamente 10.
 * 2. Los dos primeros son el código de provincia: 01 a 24, o 30.
 * 3. El tercero es de 0 a 5.
 * 4. Dígito verificador: cada uno de los 9 primeros se multiplica por 2,1,2,1,2,1,2,1,2; a los
 *    productos mayores que 9 se les resta 9; se suman; el verificador es lo que falta para la
 *    siguiente decena (`(10 - suma % 10) % 10`) y debe ser igual al décimo dígito.
 */
export function checkEcuadorCedula(value: string): EcuadorCedulaProblem | null {
  if (!/^\d+$/.test(value)) return 'format';
  if (value.length !== CEDULA_LENGTH) return 'length';

  const province = Number(value.slice(0, 2));
  const validProvince =
    (province >= 1 && province <= LAST_PROVINCE) || province === ABROAD_PROVINCE;
  if (!validProvince) return 'province';

  if (Number(value[2]) > MAX_THIRD_DIGIT) return 'third-digit';

  const sum = COEFFICIENTS.reduce((total, coefficient, index) => {
    const product = Number(value[index]) * coefficient;
    return total + (product > 9 ? product - 9 : product);
  }, 0);
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(value[9]) ? null : 'check-digit';
}

export function isValidEcuadorCedula(value: string): boolean {
  return checkEcuadorCedula(value) === null;
}

/**
 * Validador de cédula ecuatoriana. Usa la clave de error `cedula`, cuyo valor es el problema
 * (`format`, `length`, `province`, `third-digit` o `check-digit`). Vacío es válido: combinar con
 * `Validators.required`.
 */
export function ecuadorCedulaValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') return null;
  const problem = checkEcuadorCedula(String(value));
  return problem ? { cedula: problem } : null;
}
