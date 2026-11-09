/** Motivos por los que `accept_invitation` rechaza la aceptación (mensajes de la función SQL). */
export type InvitationAcceptReason = 'not_authenticated' | 'no_pending_invitation';

export class InvitationAcceptError extends Error {
  constructor(public readonly reason: InvitationAcceptReason) {
    super(`Invitation accept failed: ${reason}`);
    this.name = 'InvitationAcceptError';
  }
}
