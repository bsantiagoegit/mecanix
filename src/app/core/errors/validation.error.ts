export class ValidationError extends Error {
  constructor(public readonly fields: Record<string, string>) {
    super('Validation error');
    this.name = 'ValidationError';
  }
}
