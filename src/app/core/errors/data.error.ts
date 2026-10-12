export class DataError extends Error {
  constructor(public readonly originalError: unknown) {
    super('Data access error');
    this.name = 'DataError';
  }
}
