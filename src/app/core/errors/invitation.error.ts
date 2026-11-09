/** Códigos con los que responde la Edge Function `invite-user`. */
export type InvitationReason =
  | 'not_authenticated'
  | 'not_owner'
  | 'invalid_input'
  | 'email_already_registered'
  | 'invitation_failed';

export class InvitationError extends Error {
  constructor(public readonly reason: InvitationReason) {
    super(`Invitation failed: ${reason}`);
    this.name = 'InvitationError';
  }
}
