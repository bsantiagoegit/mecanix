import { Injectable, inject } from '@angular/core';
import {
  AuthenticationError,
  AuthorizationError,
  EmailNotConfirmedError,
  InvitationAcceptError,
  PasswordRecoveryError,
  PasswordRecoveryReason,
  mapSupabaseError,
} from '@core/errors';
import { AuthSession, PendingInvitation, Role } from './auth.model';
import { SupabaseService } from '@core/supabase';
import { Observable, from, map } from 'rxjs';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
}

interface MembershipRow {
  workshop_id: string;
  role: Role;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;

  login(email: string, password: string): Observable<AuthSession> {
    return from(this.signIn(email, password));
  }

  /** `null` si no hay sesión de Supabase vigente. */
  restoreSession(preferredWorkshopId: string | null): Observable<AuthSession | null> {
    return from(this.restore(preferredWorkshopId));
  }

  /** Rol del usuario en un taller; `AuthorizationError` si no es miembro activo. */
  roleIn(workshopId: string): Observable<Role> {
    return from(this.fetchRole(workshopId));
  }

  logout(): Promise<void> {
    return this.supabase.auth.signOut().then(() => undefined);
  }

  signInWithGoogle(): Observable<void> {
    return from(this.signInWithGoogleImpl()).pipe(map(() => undefined));
  }

  register(email: string, password: string, fullName: string): Observable<void> {
    return from(this.registerImpl(email, password, fullName)).pipe(map(() => undefined));
  }

  forgotPassword(email: string): Observable<void> {
    return from(this.forgotPasswordImpl(email)).pipe(map(() => undefined));
  }

  /**
   * Fija la contraseña del usuario con sesión (p. ej. el invitado que acepta su invitación).
   * `PasswordRecoveryError` indica si es débil, igual a la actual o si no hay sesión.
   */
  setPassword(newPassword: string): Observable<void> {
    return from(this.setPasswordImpl(newPassword));
  }

  /**
   * Cierra el flujo de recuperar la contraseña: la fija y, por seguridad, cierra las demás
   * sesiones de la cuenta (quien la tuviera abierta con la contraseña vieja ya no entra).
   */
  recoverPassword(newPassword: string): Observable<void> {
    return from(this.recoverPasswordImpl(newPassword));
  }

  /** ¿Hay una sesión de Supabase? Espera a que el cliente procese el enlace del correo. */
  hasSession(): Observable<boolean> {
    return from(this.hasSessionImpl());
  }

  /**
   * Activa la invitación pendiente del usuario (UC-WS-04). `InvitationAcceptError` indica el
   * motivo del rechazo. La contraseña se fija antes con `resetPassword`.
   */
  acceptInvitation(): Observable<void> {
    return from(this.acceptInvitationImpl());
  }

  private async acceptInvitationImpl(): Promise<void> {
    const { error } = await this.supabase.rpc('accept_invitation');
    if (!error) return;
    const reason = (['not_authenticated', 'no_pending_invitation'] as const).find((r) =>
      error.message.includes(r),
    );
    throw reason ? new InvitationAcceptError(reason) : mapSupabaseError(error);
  }

  private async signInWithGoogleImpl(): Promise<void> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    if (error) throw mapSupabaseError(error);
  }

  private async registerImpl(email: string, password: string, fullName: string): Promise<void> {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/login?confirmed=1`,
      },
    });
    if (error) throw mapSupabaseError(error);

    // Sin confirmación por email, Supabase abre sesión al registrar. Una cuenta recién creada
    // aún no tiene taller (no es una sesión de la aplicación), así que se cierra.
    if (data.session) await this.supabase.auth.signOut();
  }

  private async forgotPasswordImpl(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error?.code === 'over_email_send_rate_limit') {
      throw new PasswordRecoveryError('rate_limited');
    }
    if (error) throw mapSupabaseError(error);
  }

  private async setPasswordImpl(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({ password: newPassword });
    if (!error) return;
    const reasons: Record<string, PasswordRecoveryReason> = {
      same_password: 'same_password',
      weak_password: 'weak_password',
      session_not_found: 'no_session',
      session_expired: 'no_session',
      not_authenticated: 'no_session',
    };
    const reason = error.code ? reasons[error.code] : undefined;
    // Sin sesión, `updateUser` falla con "Auth session missing!" (AuthSessionMissingError).
    if (!reason && /session missing/i.test(error.message))
      throw new PasswordRecoveryError('no_session');
    throw reason ? new PasswordRecoveryError(reason) : mapSupabaseError(error);
  }

  private async recoverPasswordImpl(newPassword: string): Promise<void> {
    await this.setPasswordImpl(newPassword);
    // Mejor esfuerzo: la contraseña ya cambió, esto solo endurece la cuenta.
    await this.supabase.auth.signOut({ scope: 'others' }).catch(() => undefined);
  }

  private async hasSessionImpl(): Promise<boolean> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw mapSupabaseError(error);
    return data.session !== null;
  }

  private async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error?.code === 'email_not_confirmed') throw new EmailNotConfirmedError();
    if (error || !data.user) throw new AuthenticationError();

    try {
      return await this.buildSession(data.user.id, null);
    } catch (err) {
      // Sin sesión de aplicación válida no se deja la sesión de Supabase abierta.
      await this.supabase.auth.signOut();
      throw err;
    }
  }

  private async restore(preferredWorkshopId: string | null): Promise<AuthSession | null> {
    const { data, error } = await this.supabase.auth.getSession();
    if (error) throw mapSupabaseError(error);
    if (!data.session) return null;

    return this.buildSession(data.session.user.id, preferredWorkshopId);
  }

  private async fetchRole(workshopId: string): Promise<Role> {
    const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
    if (sessionError) throw mapSupabaseError(sessionError);
    if (!sessionData.session) throw new AuthenticationError();

    const { data, error } = await this.supabase
      .from('workshop_members')
      .select('role')
      .eq('workshop_id', workshopId)
      .eq('user_id', sessionData.session.user.id)
      .eq('status', 'active')
      .maybeSingle<Pick<MembershipRow, 'role'>>();
    if (error) throw mapSupabaseError(error);
    if (!data) throw new AuthorizationError();

    return data.role;
  }

  private async buildSession(
    userId: string,
    preferredWorkshopId: string | null,
  ): Promise<AuthSession> {
    const [userRes, membersRes] = await Promise.all([
      this.supabase
        .from('users')
        .select('id, email, full_name, phone')
        .eq('id', userId)
        .single<UserRow>(),
      this.supabase
        .from('workshop_members')
        .select('workshop_id, role')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true })
        .returns<MembershipRow[]>(),
    ]);

    if (userRes.error) throw mapSupabaseError(userRes.error);
    if (membersRes.error) throw mapSupabaseError(membersRes.error);

    // Sin membresía activa la sesión es válida, pero sin taller: debe crear el suyo.
    const memberships = membersRes.data;
    const membership =
      memberships.find((m) => m.workshop_id === preferredWorkshopId) ?? memberships[0] ?? null;

    const invitation = membership ? null : await this.fetchInvitation();

    const row = userRes.data;
    return {
      user: {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
      },
      role: membership?.role ?? null,
      activeWorkshopId: membership?.workshop_id ?? null,
      invitation,
    };
  }

  /** Invitación pendiente del usuario autenticado, o `null`. */
  private async fetchInvitation(): Promise<PendingInvitation | null> {
    const { data, error } = await this.supabase.rpc('get_pending_invitation');
    if (error) throw mapSupabaseError(error);
    const rows = data as { workshop_name: string; role: Role }[] | null;
    const row = rows?.[0];
    return row ? { workshopName: row.workshop_name, role: row.role } : null;
  }
}
