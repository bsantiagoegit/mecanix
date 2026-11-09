/** Motivos por los que `create_workshop` rechaza la creación (mensajes de la función SQL). */
export type WorkshopCreationReason =
  | 'user_already_has_workshop'
  | 'email_not_confirmed'
  | 'invalid_workshop_data'
  | 'not_authenticated';

export class WorkshopCreationError extends Error {
  constructor(public readonly reason: WorkshopCreationReason) {
    super(`Workshop creation failed: ${reason}`);
    this.name = 'WorkshopCreationError';
  }
}
