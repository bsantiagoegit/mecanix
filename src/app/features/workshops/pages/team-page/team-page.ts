import { Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Role } from '@core/auth';
import { AuthorizationError, InvitationError, InvitationReason } from '@core/errors';
import { WorkshopFacade } from '@core/workshops';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { Input } from '@shared/components/input/input';
import { ToastService } from '@shared/services/toast.service';
import { emailValidator } from '@shared/utils/email.validator';
import { trimOnChange } from '@shared/utils/trim-on-change';
import { InvitableRole, TeamMember, TeamService } from '../../services/team.service';

const PHONE_PATTERN = /^[0-9+()\s-]{7,20}$/;

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Dueño',
  advisor: 'Asesor',
  mechanic: 'Mecánico',
};

const INVITATION_MESSAGES: Record<InvitationReason, string> = {
  not_authenticated: 'Tu sesión expiró. Inicia sesión de nuevo.',
  not_owner: 'Solo el dueño del taller puede invitar usuarios.',
  invalid_input: 'Revisa los datos de la invitación.',
  email_already_registered: 'Ese correo ya tiene una cuenta, no se puede invitar.',
  invitation_failed: 'No se pudo enviar la invitación. Inténtalo de nuevo.',
};

/** UC-WS-03 y UC-WS-05: el `owner` ve a su equipo, invita usuarios y cambia sus roles. */
@Component({
  selector: 'app-team-page',
  imports: [ReactiveFormsModule, RouterLink, Button, Card, Input],
  templateUrl: './team-page.html',
})
export class TeamPage {
  private readonly fb = inject(FormBuilder);
  private readonly team = inject(TeamService);
  private readonly toast = inject(ToastService);
  private readonly workshops = inject(WorkshopFacade);

  readonly roleLabels = ROLE_LABELS;
  readonly invitableRoles: InvitableRole[] = ['advisor', 'mechanic'];

  readonly members = signal<TeamMember[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly formOpen = signal(false);
  readonly isInviting = signal(false);
  readonly inviteError = signal<string | null>(null);

  /** Usuario cuya cancelación espera confirmación, y el que se está procesando. */
  readonly confirmingCancel = signal<string | null>(null);
  readonly busyUserId = signal<string | null>(null);

  readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(120)]],
    email: ['', [Validators.required, emailValidator]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    role: ['advisor' as InvitableRole, [Validators.required]],
  });

  private loadedWorkshopId: string | null = null;

  constructor() {
    for (const field of ['fullName', 'email', 'phone'] as const) {
      trimOnChange(this.form.controls[field]);
    }

    effect(() => {
      const id = this.workshops.activeId();
      if (id && id !== this.loadedWorkshopId) {
        this.loadedWorkshopId = id;
        void this.load(id);
      }
    });
  }

  toggleForm(): void {
    this.formOpen.update((open) => !open);
    this.inviteError.set(null);
  }

  async onInvite(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.isInviting.set(true);
    this.inviteError.set(null);
    try {
      await this.team.invite({
        email: v.email!,
        fullName: v.fullName!,
        phone: v.phone!,
        role: v.role!,
      });
      this.toast.success(`Invitación enviada a ${v.email}`);
      this.form.reset({ fullName: '', email: '', phone: '', role: 'advisor' });
      this.formOpen.set(false);
      await this.reload();
    } catch (err) {
      this.inviteError.set(
        err instanceof InvitationError
          ? INVITATION_MESSAGES[err.reason]
          : INVITATION_MESSAGES.invitation_failed,
      );
    } finally {
      this.isInviting.set(false);
    }
  }

  async onRoleChange(member: TeamMember, role: string): Promise<void> {
    if (role === member.role || !this.isInvitable(role)) return;
    await this.mutate(
      member,
      (workshopId) => this.team.changeRole(workshopId, member.userId, role),
      'Rol actualizado',
    );
  }

  askCancel(member: TeamMember): void {
    this.confirmingCancel.set(member.userId);
  }

  dismissCancel(): void {
    this.confirmingCancel.set(null);
  }

  async confirmCancel(member: TeamMember): Promise<void> {
    this.confirmingCancel.set(null);
    await this.mutate(
      member,
      (workshopId) => this.team.cancelInvitation(workshopId, member.userId),
      'Invitación cancelada',
    );
  }

  fieldError(field: string): string {
    const control = this.form.get(field);
    if (!control?.touched || !control.errors) return '';
    if (control.errors['required']) return 'Este campo es obligatorio';
    if (control.errors['maxlength']) return 'Es demasiado largo';
    if (control.errors['email']) return 'Correo electrónico inválido';
    if (control.errors['pattern'])
      return 'Teléfono inválido (7 a 20 dígitos, puede incluir + ( ) -)';
    return '';
  }

  isInvitable(role: string): role is InvitableRole {
    return role === 'advisor' || role === 'mechanic';
  }

  private async mutate(
    member: TeamMember,
    action: (workshopId: string) => Promise<void>,
    success: string,
  ): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId) return;
    this.busyUserId.set(member.userId);
    try {
      await action(workshopId);
      this.toast.success(success);
    } catch (err) {
      this.toast.error(
        err instanceof AuthorizationError
          ? 'No se pudo aplicar el cambio: la invitación ya no está pendiente o no tienes permiso.'
          : 'No se pudo aplicar el cambio. Inténtalo de nuevo.',
      );
    } finally {
      this.busyUserId.set(null);
      await this.reload();
    }
  }

  private async reload(): Promise<void> {
    const id = this.workshops.activeId();
    if (id) await this.load(id);
  }

  private async load(workshopId: string): Promise<void> {
    this.loadError.set(null);
    try {
      this.members.set(await this.team.list(workshopId));
    } catch {
      this.loadError.set('No se pudo cargar el equipo. Inténtalo de nuevo.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
