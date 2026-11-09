import { Injectable, inject } from '@angular/core';
import { Role } from '@core/auth';
import {
  AuthorizationError,
  InvitationError,
  InvitationReason,
  mapSupabaseError,
} from '@core/errors';
import { SupabaseService } from '@core/supabase';

export type InvitableRole = Extract<Role, 'advisor' | 'mechanic'>;
export type MemberStatus = 'active' | 'invited';

export interface TeamMember {
  /** Dentro de un taller, un usuario tiene una sola membresía: `userId` la identifica. */
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  status: MemberStatus;
  invitedAt: string;
  joinedAt: string | null;
}

export interface InviteInput {
  email: string;
  fullName: string;
  phone: string;
  role: InvitableRole;
}

interface MemberRow {
  user_id: string;
  role: Role;
  status: MemberStatus;
  invited_at: string;
  joined_at: string | null;
  user: { full_name: string; email: string; phone: string | null } | null;
}

const KNOWN_REASONS: InvitationReason[] = [
  'not_authenticated',
  'not_owner',
  'invalid_input',
  'email_already_registered',
  'invitation_failed',
];

/**
 * Equipo del taller (UC-WS-03 y UC-WS-05). Las invitaciones pasan por la Edge Function
 * `invite-user`; el resto son cambios sobre la membresía que la RLS limita al `owner`.
 */
@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly supabase = inject(SupabaseService).client;

  /** Miembros activos e invitados del taller. Los desactivados no se listan. */
  async list(workshopId: string): Promise<TeamMember[]> {
    const { data, error } = await this.supabase
      .from('workshop_members')
      .select('user_id, role, status, invited_at, joined_at, user:users(full_name, email, phone)')
      .eq('workshop_id', workshopId)
      .in('status', ['active', 'invited'])
      .order('invited_at')
      .returns<MemberRow[]>();
    if (error) throw mapSupabaseError(error);
    return (data ?? []).map((row) => ({
      userId: row.user_id,
      fullName: row.user?.full_name ?? '',
      email: row.user?.email ?? '',
      phone: row.user?.phone ?? null,
      role: row.role,
      status: row.status,
      invitedAt: row.invited_at,
      joinedAt: row.joined_at,
    }));
  }

  /** Invita a una persona. `InvitationError` indica el motivo del rechazo. */
  async invite(input: InviteInput): Promise<void> {
    const { error } = await this.supabase.functions.invoke('invite-user', { body: input });
    if (!error) return;
    throw await this.toInvitationError(error);
  }

  /** Cancela una invitación pendiente: la membresía pasa a `inactive`. */
  async cancelInvitation(workshopId: string, userId: string): Promise<void> {
    await this.updateMember(workshopId, userId, { status: 'inactive' }, 'invited');
  }

  /** Cambia el rol de un miembro entre asesor y mecánico. */
  async changeRole(workshopId: string, userId: string, role: InvitableRole): Promise<void> {
    await this.updateMember(workshopId, userId, { role });
  }

  private async updateMember(
    workshopId: string,
    userId: string,
    changes: { role?: InvitableRole; status?: 'inactive' },
    onlyIfStatus?: MemberStatus,
  ): Promise<void> {
    let query = this.supabase
      .from('workshop_members')
      .update(changes)
      .eq('workshop_id', workshopId)
      .eq('user_id', userId);
    if (onlyIfStatus) query = query.eq('status', onlyIfStatus);
    const { data, error } = await query.select('user_id');
    if (error) throw mapSupabaseError(error);
    // Sin filas: la RLS no lo permite o la membresía ya no está en ese estado.
    if (!data?.length) throw new AuthorizationError();
  }

  private async toInvitationError(error: unknown): Promise<Error> {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const body = (await context.json().catch(() => null)) as { error?: string } | null;
      const reason = KNOWN_REASONS.find((r) => r === body?.error);
      if (reason) return new InvitationError(reason);
    }
    return new InvitationError('invitation_failed');
  }
}
