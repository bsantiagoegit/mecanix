export class NotFoundError extends Error {
  constructor(
    public readonly entity: string,
    public readonly id: string,
  ) {
    super(`${entity} not found: ${id}`);
    this.name = 'NotFoundError';
  }
}
