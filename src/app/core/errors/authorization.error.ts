export class AuthorizationError extends Error {
  constructor() {
    super('Not authorized');
    this.name = 'AuthorizationError';
  }
}
