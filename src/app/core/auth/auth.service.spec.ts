import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import {
  AuthenticationError,
  AuthorizationError,
  DataError,
  EmailNotConfirmedError,
  ValidationError,
} from '@core/errors';
import { SupabaseService } from '@core/supabase';
import { AuthService } from './auth.service';

interface QueryResult {
  data: unknown;
  error: { code?: string; message: string } | null;
}

/** Query builder falso: cada método devuelve el mismo objeto, que además es "await-able". */
function query(result: QueryResult) {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'order', 'returns']) {
    chain[method] = vi.fn(() => chain);
  }
  chain['single'] = vi.fn(() => Promise.resolve(result));
  chain['maybeSingle'] = vi.fn(() => Promise.resolve(result));
  chain['then'] = (resolve: (r: QueryResult) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

const ok = (data: unknown): QueryResult => ({ data, error: null });
const fail = (message: string, code?: string): QueryResult => ({
  data: null,
  error: { message, code },
});

const USER_ROW = { id: 'u1', email: 'a@x.com', full_name: 'Ana Pérez', phone: '099' };
const MEMBERS = [
  { workshop_id: 'w1', role: 'owner' },
  { workshop_id: 'w2', role: 'mechanic' },
];

describe('AuthService', () => {
  let results: { users: QueryResult; workshop_members: QueryResult };
  let auth: Record<string, ReturnType<typeof vi.fn>>;
  let service: AuthService;

  beforeEach(() => {
    results = { users: ok(USER_ROW), workshop_members: ok(MEMBERS) };
    auth = {
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ data: { user: { id: 'u1' } }, error: null }),
      ),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      getSession: vi.fn(() =>
        Promise.resolve({ data: { session: { user: { id: 'u1' } } }, error: null }),
      ),
      signInWithOAuth: vi.fn(() => Promise.resolve({ error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      resetPasswordForEmail: vi.fn(() => Promise.resolve({ error: null })),
      updateUser: vi.fn(() => Promise.resolve({ error: null })),
    };
    const client = {
      auth,
      from: vi.fn((table: keyof typeof results) => query(results[table])),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client } }],
    });
    service = TestBed.inject(AuthService);
  });

  describe('login', () => {
    it('devuelve usuario, rol y taller activo (el primero por antigüedad)', async () => {
      const session = await firstValueFrom(service.login('a@x.com', 'secret'));

      expect(auth['signInWithPassword']).toHaveBeenCalledWith({
        email: 'a@x.com',
        password: 'secret',
      });
      expect(session).toEqual({
        user: { id: 'u1', email: 'a@x.com', fullName: 'Ana Pérez', phone: '099' },
        role: 'owner',
        activeWorkshopId: 'w1',
      });
    });

    it('credenciales inválidas → AuthenticationError, sin consultar tablas', async () => {
      auth['signInWithPassword'].mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid login credentials' },
      });

      await expect(firstValueFrom(service.login('a@x.com', 'mal'))).rejects.toBeInstanceOf(
        AuthenticationError,
      );
      expect(auth['signOut']).not.toHaveBeenCalled();
    });

    it('email sin confirmar → EmailNotConfirmedError', async () => {
      auth['signInWithPassword'].mockResolvedValue({
        data: { user: null },
        error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
      });

      await expect(firstValueFrom(service.login('a@x.com', 'secret'))).rejects.toBeInstanceOf(
        EmailNotConfirmedError,
      );
    });

    it('usuario sin taller → sesión válida sin rol ni taller (debe crear el suyo)', async () => {
      results.workshop_members = ok([]);

      const session = await firstValueFrom(service.login('a@x.com', 'secret'));

      expect(session).toEqual({
        user: { id: 'u1', email: 'a@x.com', fullName: 'Ana Pérez', phone: '099' },
        role: null,
        activeWorkshopId: null,
      });
      expect(auth['signOut']).not.toHaveBeenCalled();
    });

    it('error al leer el perfil → error mapeado y cierra la sesión de Supabase', async () => {
      results.users = fail('boom');

      await expect(firstValueFrom(service.login('a@x.com', 'secret'))).rejects.toBeInstanceOf(
        DataError,
      );
      expect(auth['signOut']).toHaveBeenCalledTimes(1);
    });
  });

  describe('restoreSession', () => {
    it('sin sesión de Supabase → null', async () => {
      auth['getSession'].mockResolvedValue({ data: { session: null }, error: null });

      expect(await firstValueFrom(service.restoreSession(null))).toBeNull();
    });

    it('respeta el taller preferido si el usuario sigue siendo miembro', async () => {
      const session = await firstValueFrom(service.restoreSession('w2'));

      expect(session).toMatchObject({ activeWorkshopId: 'w2', role: 'mechanic' });
    });

    it('si el taller preferido ya no es válido, usa el primero', async () => {
      const session = await firstValueFrom(service.restoreSession('w-viejo'));

      expect(session).toMatchObject({ activeWorkshopId: 'w1', role: 'owner' });
    });

    it('sesión vigente pero sin talleres → sesión sin taller, sin cerrar la de Supabase', async () => {
      results.workshop_members = ok([]);

      const session = await firstValueFrom(service.restoreSession(null));

      expect(session).toMatchObject({ role: null, activeWorkshopId: null });
      expect(auth['signOut']).not.toHaveBeenCalled();
    });

    it('un error de datos al restaurar no cierra la sesión de Supabase', async () => {
      results.users = fail('boom');

      await expect(firstValueFrom(service.restoreSession(null))).rejects.toBeInstanceOf(DataError);
      expect(auth['signOut']).not.toHaveBeenCalled();
    });

    it('error de Supabase al leer la sesión se mapea', async () => {
      auth['getSession'].mockResolvedValue({ data: { session: null }, error: { message: 'x' } });

      await expect(firstValueFrom(service.restoreSession(null))).rejects.toBeInstanceOf(DataError);
    });
  });

  describe('roleIn', () => {
    it('devuelve el rol en el taller indicado', async () => {
      results.workshop_members = ok({ role: 'advisor' });

      expect(await firstValueFrom(service.roleIn('w1'))).toBe('advisor');
    });

    it('no es miembro activo → AuthorizationError', async () => {
      results.workshop_members = ok(null);

      await expect(firstValueFrom(service.roleIn('w9'))).rejects.toBeInstanceOf(AuthorizationError);
    });

    it('sin sesión → AuthenticationError', async () => {
      auth['getSession'].mockResolvedValue({ data: { session: null }, error: null });

      await expect(firstValueFrom(service.roleIn('w1'))).rejects.toBeInstanceOf(
        AuthenticationError,
      );
    });

    it('error de base de datos se mapea', async () => {
      results.workshop_members = fail('boom');

      await expect(firstValueFrom(service.roleIn('w1'))).rejects.toBeInstanceOf(DataError);
    });
  });

  describe('logout', () => {
    it('cierra la sesión de Supabase', async () => {
      await service.logout();

      expect(auth['signOut']).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('envía full_name y redirige al login indicando que confirmó el correo', async () => {
      await firstValueFrom(service.register('a@x.com', 'secret', 'Ana Pérez'));

      expect(auth['signUp']).toHaveBeenCalledWith({
        email: 'a@x.com',
        password: 'secret',
        options: {
          data: { full_name: 'Ana Pérez' },
          emailRedirectTo: `${window.location.origin}/auth/login?confirmed=1`,
        },
      });
    });

    it('cierra la sesión que Supabase abre al registrar (la cuenta aún no tiene taller)', async () => {
      auth['signUp'].mockResolvedValue({ data: { session: { access_token: 't' } }, error: null });

      await firstValueFrom(service.register('a@x.com', 'secret', 'Ana'));

      expect(auth['signOut']).toHaveBeenCalledTimes(1);
    });

    it('no cierra sesión si no se abrió ninguna (confirmación por email)', async () => {
      await firstValueFrom(service.register('a@x.com', 'secret', 'Ana'));

      expect(auth['signOut']).not.toHaveBeenCalled();
    });

    it('propaga el error mapeado (email duplicado → ValidationError)', async () => {
      auth['signUp'].mockResolvedValue({
        data: { session: null },
        error: { message: 'dup', code: '23505' },
      });

      await expect(
        firstValueFrom(service.register('a@x.com', 'secret', 'Ana')),
      ).rejects.toBeInstanceOf(ValidationError);
    });
  });

  describe('forgotPassword', () => {
    it('pide el correo con redirección a reset-password', async () => {
      await firstValueFrom(service.forgotPassword('a@x.com'));

      expect(auth['resetPasswordForEmail']).toHaveBeenCalledWith('a@x.com', {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
    });

    it('propaga el error mapeado', async () => {
      auth['resetPasswordForEmail'].mockResolvedValue({ error: { message: 'x' } });

      await expect(firstValueFrom(service.forgotPassword('a@x.com'))).rejects.toBeInstanceOf(
        DataError,
      );
    });
  });

  describe('resetPassword', () => {
    it('actualiza la contraseña del usuario', async () => {
      await firstValueFrom(service.resetPassword('nueva-clave'));

      expect(auth['updateUser']).toHaveBeenCalledWith({ password: 'nueva-clave' });
    });

    it('propaga el error mapeado', async () => {
      auth['updateUser'].mockResolvedValue({ error: { message: 'x' } });

      await expect(firstValueFrom(service.resetPassword('x'))).rejects.toBeInstanceOf(DataError);
    });
  });

  describe('signInWithGoogle', () => {
    it('inicia OAuth con redirección al dashboard', async () => {
      await firstValueFrom(service.signInWithGoogle());

      expect(auth['signInWithOAuth']).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
    });

    it('propaga el error mapeado', async () => {
      auth['signInWithOAuth'].mockResolvedValue({ error: { message: 'x' } });

      await expect(firstValueFrom(service.signInWithGoogle())).rejects.toBeInstanceOf(DataError);
    });
  });
});
