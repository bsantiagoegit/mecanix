import { AuthorizationError } from './authorization.error';
import { DataError } from './data.error';
import { ValidationError } from './validation.error';

interface SupabaseErrorLike {
  code?: string;
  message: string;
}

/** Códigos PostgreSQL que se reportan como error de validación (unique, FK, CHECK). */
const VALIDATION_CODES = new Set(['23505', '23503', '23514']);

/** Insufficient privilege: la política RLS rechazó la operación. */
const RLS_CODE = '42501';

/**
 * Traduce un error de Supabase a un error de dominio (D-FE-12).
 *
 * `fields` permite al data service indicar a qué campo del formulario
 * corresponde una violación de validación; sin él se usa la clave `form`.
 * Ver docs/architecture/frontend/error-handling.md.
 */
export function mapSupabaseError(
  error: SupabaseErrorLike,
  fields?: Record<string, string>,
): ValidationError | AuthorizationError | DataError {
  if (error.code && VALIDATION_CODES.has(error.code)) {
    return new ValidationError(fields ?? { form: error.message });
  }
  if (error.code === RLS_CODE || error.message.includes('policy')) {
    return new AuthorizationError();
  }
  return new DataError(error);
}
