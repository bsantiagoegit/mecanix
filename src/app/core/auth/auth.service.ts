import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { AuthenticationError, AuthorizationError, DataError } from '../errors';
import { SupabaseService } from '../supabase';
import { AuthSession, Role } from './auth.models';

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

  logout(): Promise<void> {
    return this.supabase.auth.signOut().then(() => undefined);
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
    if (error) throw new DataError(error);
    if (!data.session) return null;

    return this.buildSession(data.session.user.id, preferredWorkshopId);
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

    if (userRes.error) throw new DataError(userRes.error);
    if (membersRes.error) throw new DataError(membersRes.error);

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
