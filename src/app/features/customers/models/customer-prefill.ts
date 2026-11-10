/** Mismo formato de teléfono que el formulario y la base de datos. */
const PHONE_PATTERN = /^[0-9+()\s-]{7,20}$/;

export interface CustomerPrefill {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Qué escribir ya en el formulario "Nuevo cliente" a partir de lo que el usuario buscó sin
 * encontrar nada (UC-CUST-01/02): un teléfono va al teléfono; un texto sin números va al
 * nombre (la primera palabra) y al apellido (el resto). Otra cosa (p. ej. una identificación)
 * no se adivina.
 */
export function prefillFromSearch(text: string): CustomerPrefill {
  const value = text.trim();
  if (value === '') return {};

  const hasDigits = /\d/.test(value);
  if (hasDigits) return PHONE_PATTERN.test(value) ? { phone: value } : {};

  const [first, ...rest] = value.split(/\s+/);
  return rest.length > 0 ? { firstName: first, lastName: rest.join(' ') } : { firstName: first };
}
