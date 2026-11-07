import { AuthorizationError } from './authorization.error';
import { DataError } from './data.error';
import { mapSupabaseError } from './map-supabase-error';
import { ValidationError } from './validation.error';

describe('mapSupabaseError', () => {
  it.each(['23505', '23503', '23514'])('maps %s to ValidationError', (code) => {
    const error = mapSupabaseError({ code, message: 'violates constraint' });
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).fields).toEqual({ form: 'violates constraint' });
  });

  it('uses the provided field map for validation errors', () => {
    const error = mapSupabaseError({ code: '23505', message: 'dup' }, { identification: 'Ya existe' });
    expect((error as ValidationError).fields).toEqual({ identification: 'Ya existe' });
  });

  it('maps 42501 to AuthorizationError', () => {
    expect(mapSupabaseError({ code: '42501', message: 'denied' })).toBeInstanceOf(AuthorizationError);
  });

  it('maps RLS policy messages to AuthorizationError', () => {
    const error = mapSupabaseError({ message: 'new row violates row-level security policy' });
    expect(error).toBeInstanceOf(AuthorizationError);
  });

  it('maps anything else to DataError and keeps the original error', () => {
    const original = { code: 'XX000', message: 'boom' };
    const error = mapSupabaseError(original);
    expect(error).toBeInstanceOf(DataError);
    expect((error as DataError).originalError).toBe(original);
  });
});
