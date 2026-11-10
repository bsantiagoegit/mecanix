import { CustomerMatch } from './customer.model';

/**
 * La identificación ya pertenece a otro cliente del taller (la identificación es única por
 * taller entre los clientes no eliminados). Lleva al cliente existente, si se pudo consultar,
 * para que el usuario lo use en lugar de crear otro.
 */
export class DuplicateIdentificationError extends Error {
  constructor(
    public readonly identification: string,
    public readonly existing: CustomerMatch | null,
  ) {
    super(`Duplicate customer identification: ${identification}`);
    this.name = 'DuplicateIdentificationError';
  }
}
