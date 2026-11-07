import { Injectable, inject } from '@angular/core';
import { AuthenticationError, AuthorizationError, mapSupabaseError } from '@core/errors';
import { AuthSession, Role } from './auth.model';
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

  resetPassword(newPassword: string): Observable<void> {
    return from(this.resetPasswordImpl(newPassword)).pipe(map(() => undefined));
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
    const { error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });
    if (error) throw mapSupabaseError(error);
  }

  private async forgotPasswordImpl(email: string): Promise<void> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) throw mapSupabaseError(error);
  }

  private async resetPasswordImpl(newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw mapSupabaseError(error);
  }

  private async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
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

    const memberships = membersRes.data;
    const membership =
      memberships.find((m) => m.workshop_id === preferredWorkshopId) ?? memberships[0];
    if (!membership) throw new AuthorizationError();

    const row = userRes.data;
    return {
      user: {
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        phone: row.phone,
      },
      role: membership.role,
      activeWorkshopId: membership.workshop_id,
    };
  }
}
