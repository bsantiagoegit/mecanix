import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Debe coincidir con `minimum_password_length` y `password_requirements`
 * (`lower_upper_letters_digits`) de supabase/config.toml: si no, la app aceptaría una contraseña
 * que el servidor rechaza.
 */
export const PASSWORD_MIN_LENGTH = 8;

export type PasswordRuleId = 'length' | 'lower' | 'upper' | 'digit';

export interface PasswordRule {
  id: PasswordRuleId;
  /** Texto para la lista de reglas ("Al menos 8 caracteres"). */
  label: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'length',
    label: `Al menos ${PASSWORD_MIN_LENGTH} caracteres`,
    test: (v) => v.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'upper', label: 'Una letra mayúscula', test: (v) => /\p{Lu}/u.test(v) },
  { id: 'lower', label: 'Una letra minúscula', test: (v) => /\p{Ll}/u.test(v) },
  { id: 'digit', label: 'Un número', test: (v) => /\d/.test(v) },
];

/** Reglas que `value` no cumple, en el orden de `PASSWORD_RULES`; vacío si la contraseña es válida. */
export function checkPassword(value: string | null | undefined): PasswordRuleId[] {
  const text = value ?? '';
  return PASSWORD_RULES.filter((rule) => !rule.test(text)).map((rule) => rule.id);
}

/** Error `password` con las reglas que faltan. Un campo vacío lo resuelve `Validators.required`. */
export const passwordValidator: ValidatorFn = (
  control: AbstractControl,
): ValidationErrors | null => {
  const value = control.value as string | null;
  if (!value) return null;
  const missing = checkPassword(value);
  return missing.length ? { password: { missing } } : null;
};

/** Mensaje corto para un campo de contraseña con el error `password`. */
export function passwordErrorMessage(missing: readonly PasswordRuleId[]): string {
  if (missing.includes('length')) return `Mínimo ${PASSWORD_MIN_LENGTH} caracteres`;
  const parts = missing.map((id) =>
    PASSWORD_RULES.find((rule) => rule.id === id)!.label.toLowerCase(),
  );
  const [last, ...rest] = parts.reverse();
  return `Falta ${rest.length ? `${rest.reverse().join(', ')} y ${last}` : last}`;
}

/** Validador de grupo: `password` y `confirmPassword` deben ser iguales. */
export const passwordsMatchValidator: ValidatorFn = (
  group: AbstractControl,
): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
};
