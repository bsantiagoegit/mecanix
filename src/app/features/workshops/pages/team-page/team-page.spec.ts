import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InvitationError } from '@core/errors';
import { ToastService } from '@shared/services/toast.service';
import { initialWorkshopState } from '@core/workshops/store/workshop.state';
import { provideTestStore } from '../../../../../testing/utils/store';
import { TeamMember, TeamService } from '../../services/team.service';
import { TeamPage } from './team-page';

const member = (over: Partial<TeamMember> = {}): TeamMember => ({
  userId: 'u1',
  fullName: 'Ana Pérez',
  email: 'ana@x.com',
  phone: '0999999999',
  role: 'advisor',
  status: 'active',
  invitedAt: '2026-11-01',
  joinedAt: '2026-11-02',
  ...over,
});

const owner = member({ userId: 'u0', fullName: 'Dueño', role: 'owner' });
const invited = member({
  userId: 'u2',
  fullName: 'Luis',
  status: 'invited',
  role: 'mechanic',
});

const valid = {
  fullName: 'Nuevo',
  email: 'nuevo@x.com',
  phone: '0991112233',
  role: 'advisor' as const,
};

function setup(list: TeamMember[] = [owner, member(), invited]) {
  const team = {
    list: vi.fn().mockResolvedValue(list),
    invite: vi.fn().mockResolvedValue(undefined),
    cancelInvitation: vi.fn().mockResolvedValue(undefined),
    changeRole: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({
    imports: [TeamPage],
    providers: [
      provideRouter([]),
      provideTestStore({ workshops: { ...initialWorkshopState, active: { id: 'w1' } } }),
      { provide: TeamService, useValue: team },
    ],
  });
  const fixture = TestBed.createComponent(TeamPage);
  fixture.detectChanges();
  return {
    fixture,
    team,
    toast: TestBed.inject(ToastService),
    component: fixture.componentInstance,
    element: fixture.nativeElement as HTMLElement,
  };
}

describe('TeamPage', () => {
  it('loads and lists the members of the active workshop', async () => {
    const { fixture, team, element } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(team.list).toHaveBeenCalledWith('w1');
    expect(element.textContent).toContain('Ana Pérez');
    expect(element.textContent).toContain('Luis');
    expect(element.textContent).toContain('Invitado');
  });

  it('shows the owner without role controls and no cancel button', async () => {
    const { fixture, element } = setup([owner]);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.textContent).toContain('Dueño');
    expect(element.querySelector('select[aria-label="Rol de Dueño"]')).toBeNull();
    expect(element.textContent).not.toContain('Cancelar invitación');
  });

  it('offers cancel only for pending invitations', async () => {
    const { fixture, element } = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.textContent?.match(/Cancelar invitación/g)).toHaveLength(1);
  });

  it('shows an error when the list cannot be loaded', async () => {
    const { fixture, team, component, element } = setup();
    await fixture.whenStable();
    team.list.mockRejectedValue(new Error('x'));
    await component['reload']();
    await fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('No se pudo cargar');
  });

  describe('invite form', () => {
    it('is closed until the button opens it', async () => {
      const { fixture, component, element } = setup();
      await fixture.whenStable();
      expect(element.textContent).not.toContain('Enviar invitación');
      component.toggleForm();
      await fixture.whenStable();
      expect(element.textContent).toContain('Enviar invitación');
    });

    it('does not call the function with an invalid form', async () => {
      const { component, team } = setup();
      await component.onInvite();
      expect(team.invite).not.toHaveBeenCalled();
      expect(component.fieldError('fullName')).toBe('Este campo es obligatorio');
    });

    it('rejects a malformed email and phone', () => {
      const { component } = setup();
      component.form.patchValue({ email: 'ana@example', phone: 'abc' });
      component.form.markAllAsTouched();
      expect(component.fieldError('email')).toBe('Correo electrónico inválido');
      expect(component.fieldError('phone')).toContain('Teléfono inválido');
    });

    it('invites, thanks the owner, closes the form and reloads the list', async () => {
      const { fixture, component, team, toast } = setup();
      await fixture.whenStable();
      const success = vi.spyOn(toast, 'success');
      component.formOpen.set(true);
      component.form.setValue(valid);
      await component.onInvite();

      expect(team.invite).toHaveBeenCalledWith(valid);
      expect(success).toHaveBeenCalledWith('Invitación enviada a nuevo@x.com');
      expect(component.formOpen()).toBe(false);
      expect(team.list).toHaveBeenCalledTimes(2);
      expect(component.form.getRawValue().email).toBe('');
    });

    it.each([
      ['email_already_registered', 'ya tiene una cuenta'],
      ['not_owner', 'Solo el dueño'],
      ['invalid_input', 'Revisa los datos'],
    ] as const)('shows a readable message for "%s"', async (reason, text) => {
      const { fixture, component, team, element } = setup();
      team.invite.mockRejectedValue(new InvitationError(reason));
      component.formOpen.set(true);
      component.form.setValue(valid);
      await component.onInvite();
      await fixture.whenStable();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain(text);
      expect(component.isInviting()).toBe(false);
      expect(component.formOpen()).toBe(true);
    });

    it('shows a generic message for unexpected errors', async () => {
      const { component, team } = setup();
      team.invite.mockRejectedValue(new Error('boom'));
      component.form.setValue(valid);
      await component.onInvite();
      expect(component.inviteError()).toContain('No se pudo enviar');
    });
  });

  describe('role and cancellation', () => {
    it('changes the role and reloads', async () => {
      const { fixture, component, team } = setup();
      await fixture.whenStable();
      await component.onRoleChange(member(), 'mechanic');
      expect(team.changeRole).toHaveBeenCalledWith('w1', 'u1', 'mechanic');
      expect(team.list).toHaveBeenCalledTimes(2);
    });

    it('ignores an unchanged or non-invitable role', async () => {
      const { component, team } = setup();
      await component.onRoleChange(member(), 'advisor');
      await component.onRoleChange(member(), 'owner');
      expect(team.changeRole).not.toHaveBeenCalled();
    });

    it('asks for confirmation before cancelling an invitation', async () => {
      const { component, team } = setup();
      component.askCancel(invited);
      expect(component.confirmingCancel()).toBe('u2');
      expect(team.cancelInvitation).not.toHaveBeenCalled();

      await component.confirmCancel(invited);
      expect(team.cancelInvitation).toHaveBeenCalledWith('w1', 'u2');
      expect(component.confirmingCancel()).toBeNull();
    });

    it('keeps the invitation when the owner dismisses the confirmation', () => {
      const { component, team } = setup();
      component.askCancel(invited);
      component.dismissCancel();
      expect(component.confirmingCancel()).toBeNull();
      expect(team.cancelInvitation).not.toHaveBeenCalled();
    });

    it('reports a failed change with a toast', async () => {
      const { component, team, toast } = setup();
      team.cancelInvitation.mockRejectedValue(new Error('x'));
      const error = vi.spyOn(toast, 'error');
      await component.confirmCancel(invited);
      expect(error).toHaveBeenCalled();
      expect(component.busyUserId()).toBeNull();
    });
  });
});
