/** Motivos por los que falla pedir o fijar una contraseña (códigos de Supabase Auth). */
export type PasswordRecoveryReason =
  'rate_limited' | 'same_password' | 'weak_password' | 'no_session';

export class PasswordRecoveryError extends Error {
  constructor(public readonly reason: PasswordRecoveryReason) {
    super(`Password recovery failed: ${reason}`);
    this.name = 'PasswordRecoveryError';
  }
}
