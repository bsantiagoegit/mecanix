import { TestBed } from '@angular/core/testing';
import { DataError, NotFoundError, ValidationError } from '@core/errors';
import { SupabaseService } from '@core/supabase';
import { CUSTOMER_PAGE_SIZE, CustomerInput } from '../models/customer.model';
import { DuplicateIdentificationError } from '../models/duplicate-identification.error';
import { CustomersService } from './customers.service';

const row = (n: number, over: Record<string, unknown> = {}) => ({
  id: `c${n}`,
  first_name: `Nombre${n}`,
  last_name: `Apellido${n}`,
  phone: `099000000${n}`,
  email: null,
  identification: null,
  ...over,
});

/** Cadena de consulta falsa: cada método devuelve la misma cadena, que además se puede esperar. */
function query(result: unknown) {
  const calls: Record<string, unknown[][]> = {};
  const chain: Record<string, unknown> = {};
  for (const name of [
    'select',
    'insert',
    'update',
    'eq',
    'neq',
    'is',
    'order',
    'limit',
    'single',
    'maybeSingle',
  ]) {
    chain[name] = (...args: unknown[]) => {
      (calls[name] ??= []).push(args);
      return ['single', 'maybeSingle'].includes(name) ? Promise.resolve(result) : chain;
    };
  }
  chain['then'] = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return { chain, calls };
}

const fullRow = (over: Record<string, unknown> = {}) => ({
  ...row(1),
  address: 'Calle 1',
  ...over,
});

const input: CustomerInput = {
  firstName: 'Ana',
  lastName: 'Pérez',
  phone: '0987654321',
  email: null,
  identification: 'AB123',
  address: null,
};

describe('CustomersService', () => {
  const rpc = vi.fn();
  const from = vi.fn();
  let service: CustomersService;

  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: [], error: null });
    from.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client: { rpc, from } } }],
    });
    service = TestBed.inject(CustomersService);
  });

  it('calls search_customers with the workshop, the text and one extra row to detect more pages', async () => {
    await service.search('w1', 'ana pérez');

    expect(rpc).toHaveBeenCalledWith('search_customers', {
      p_workshop_id: 'w1',
      p_query: 'ana pérez',
      p_limit: CUSTOMER_PAGE_SIZE + 1,
      p_offset: 0,
    });
  });

  it('sends null when there is no text', async () => {
    await service.search('w1', '');
    await service.search('w1', '   ');

    expect(rpc.mock.calls[0][1].p_query).toBeNull();
    expect(rpc.mock.calls[1][1].p_query).toBeNull();
  });

  it('passes the offset and the page size', async () => {
    await service.search('w1', 'x', 40, 10);
    expect(rpc).toHaveBeenCalledWith('search_customers', {
      p_workshop_id: 'w1',
      p_query: 'x',
      p_limit: 11,
      p_offset: 40,
    });
  });

  it('maps the rows to customers', async () => {
    rpc.mockResolvedValue({
      data: [row(1, { email: 'a@x.com', identification: 'AB1' })],
      error: null,
    });

    const page = await service.search('w1', '');

    expect(page.items).toEqual([
      {
        id: 'c1',
        firstName: 'Nombre1',
        lastName: 'Apellido1',
        phone: '0990000001',
        email: 'a@x.com',
        identification: 'AB1',
      },
    ]);
    expect(page.hasMore).toBe(false);
  });

  it('keeps the contact data as null for the mechanic', async () => {
    rpc.mockResolvedValue({
      data: [row(1, { phone: null, email: null, identification: null })],
      error: null,
    });

    const [customer] = (await service.search('w1', '')).items;

    expect(customer.phone).toBeNull();
    expect(customer.email).toBeNull();
    expect(customer.identification).toBeNull();
  });

  it('reports more pages and drops the extra row when the page is full', async () => {
    rpc.mockResolvedValue({
      data: Array.from({ length: CUSTOMER_PAGE_SIZE + 1 }, (_, i) => row(i)),
      error: null,
    });

    const page = await service.search('w1', '');

    expect(page.hasMore).toBe(true);
    expect(page.items).toHaveLength(CUSTOMER_PAGE_SIZE);
  });

  it('reports no more pages on an exact page', async () => {
    rpc.mockResolvedValue({
      data: Array.from({ length: CUSTOMER_PAGE_SIZE }, (_, i) => row(i)),
      error: null,
    });

    expect((await service.search('w1', '')).hasMore).toBe(false);
  });

  it('treats a missing result as an empty page', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await service.search('w1', '')).toEqual({ items: [], hasMore: false });
  });

  it('throws a mapped error when the call fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '500', message: 'boom' } });
    await expect(service.search('w1', '')).rejects.toBeInstanceOf(DataError);
  });

  describe('getById', () => {
    it('returns the full customer, active and by id', async () => {
      const { chain, calls } = query({ data: fullRow(), error: null });
      from.mockReturnValue(chain);

      const customer = await service.getById('c1');

      expect(from).toHaveBeenCalledWith('customers');
      expect(calls['eq']).toEqual([['id', 'c1']]);
      expect(calls['is']).toEqual([['deleted_at', null]]);
      expect(customer).toMatchObject({ id: 'c1', firstName: 'Nombre1', address: 'Calle 1' });
    });

    it('returns null when it does not exist, is deleted or belongs to another workshop', async () => {
      from.mockReturnValue(query({ data: null, error: null }).chain);
      expect(await service.getById('x')).toBeNull();
    });

    it('throws a mapped error when the query fails', async () => {
      from.mockReturnValue(query({ data: null, error: { code: '500', message: 'boom' } }).chain);
      await expect(service.getById('c1')).rejects.toBeInstanceOf(DataError);
    });
  });

  describe('create', () => {
    it('inserts the data in the workshop and returns the saved customer', async () => {
      const { chain, calls } = query({ data: fullRow(), error: null });
      from.mockReturnValue(chain);

      const customer = await service.create('w1', input);

      expect(calls['insert'][0][0]).toEqual({
        workshop_id: 'w1',
        first_name: 'Ana',
        last_name: 'Pérez',
        phone: '0987654321',
        email: null,
        identification: 'AB123',
        address: null,
      });
      expect(customer.id).toBe('c1');
    });

    it('reports a taken identification with the customer that already has it', async () => {
      const failing = query({
        data: null,
        error: {
          code: '23505',
          message: 'duplicate key value violates unique constraint "idx_customers_identification"',
        },
      });
      const lookup = query({
        data: fullRow({ id: 'c9', first_name: 'Luis', last_name: 'Gómez' }),
        error: null,
      });
      from.mockReturnValueOnce(failing.chain).mockReturnValueOnce(lookup.chain);

      const error = await service.create('w1', input).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DuplicateIdentificationError);
      expect((error as DuplicateIdentificationError).identification).toBe('AB123');
      expect((error as DuplicateIdentificationError).existing).toEqual({
        id: 'c9',
        fullName: 'Luis Gómez',
        phone: '0990000001',
      });
      expect(lookup.calls['eq']).toContainEqual(['identification', 'AB123']);
    });

    it('still reports the duplicate if the existing customer cannot be looked up', async () => {
      from
        .mockReturnValueOnce(
          query({
            data: null,
            error: { code: '23505', message: 'violates "idx_customers_identification"' },
          }).chain,
        )
        .mockReturnValueOnce(query({ data: null, error: { message: 'boom' } }).chain);

      const error = await service.create('w1', input).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(DuplicateIdentificationError);
      expect((error as DuplicateIdentificationError).existing).toBeNull();
    });

    it('maps any other unique violation as a validation error', async () => {
      from.mockReturnValue(
        query({ data: null, error: { code: '23505', message: 'violates "other_index"' } }).chain,
      );
      await expect(service.create('w1', input)).rejects.toBeInstanceOf(ValidationError);
    });

    it('maps a check violation as a validation error', async () => {
      from.mockReturnValue(
        query({ data: null, error: { code: '23514', message: 'customers_phone_valid' } }).chain,
      );
      await expect(service.create('w1', input)).rejects.toBeInstanceOf(ValidationError);
    });

    it('maps other failures as data errors', async () => {
      from.mockReturnValue(query({ data: null, error: { code: '500', message: 'boom' } }).chain);
      await expect(service.create('w1', input)).rejects.toBeInstanceOf(DataError);
    });
  });

  describe('update', () => {
    it('updates the active customer by id and returns it', async () => {
      const { chain, calls } = query({ data: fullRow({ first_name: 'Nuevo' }), error: null });
      from.mockReturnValue(chain);

      const customer = await service.update('w1', 'c1', input);

      expect(calls['update'][0][0]).toMatchObject({ first_name: 'Ana', identification: 'AB123' });
      expect(calls['update'][0][0]).not.toHaveProperty('workshop_id');
      expect(calls['eq']).toEqual([['id', 'c1']]);
      expect(calls['is']).toEqual([['deleted_at', null]]);
      expect(customer.firstName).toBe('Nuevo');
    });

    it('reports NotFoundError when no row was updated', async () => {
      from.mockReturnValue(query({ data: null, error: null }).chain);
      await expect(service.update('w1', 'c1', input)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('ignores the customer itself when looking for the owner of a taken identification', async () => {
      const lookup = query({ data: fullRow({ id: 'c9' }), error: null });
      from
        .mockReturnValueOnce(
          query({
            data: null,
            error: { code: '23505', message: 'violates "idx_customers_identification"' },
          }).chain,
        )
        .mockReturnValueOnce(lookup.chain);

      await service.update('w1', 'c1', input).catch(() => null);

      expect(lookup.calls['neq']).toEqual([['id', 'c1']]);
    });
  });

  describe('findByPhone', () => {
    it('lists the other active customers of the workshop with that phone', async () => {
      const { chain, calls } = query({ data: [fullRow(), fullRow({ id: 'c2' })], error: null });
      from.mockReturnValue(chain);

      const matches = await service.findByPhone('w1', ' 0987654321 ', 'c9');

      expect(calls['eq']).toEqual([
        ['workshop_id', 'w1'],
        ['phone', '0987654321'],
      ]);
      expect(calls['neq']).toEqual([['id', 'c9']]);
      expect(calls['limit']).toEqual([[5]]);
      expect(matches).toEqual([
        { id: 'c1', fullName: 'Nombre1 Apellido1', phone: '0990000001' },
        { id: 'c2', fullName: 'Nombre1 Apellido1', phone: '0990000001' },
      ]);
    });

    it('does not exclude anyone when registering', async () => {
      const { chain, calls } = query({ data: [], error: null });
      from.mockReturnValue(chain);
      await service.findByPhone('w1', '0987654321');
      expect(calls['neq']).toBeUndefined();
    });

    it('throws a mapped error when the query fails', async () => {
      from.mockReturnValue(query({ data: null, error: { code: '500', message: 'boom' } }).chain);
      await expect(service.findByPhone('w1', '0987654321')).rejects.toBeInstanceOf(DataError);
    });
  });

  describe('findByIdentification', () => {
    it('looks the identification up in uppercase', async () => {
      const { chain, calls } = query({ data: fullRow(), error: null });
      from.mockReturnValue(chain);

      const match = await service.findByIdentification('w1', ' ab123 ');

      expect(calls['eq']).toContainEqual(['identification', 'AB123']);
      expect(match?.id).toBe('c1');
    });

    it('returns null when nobody has it', async () => {
      from.mockReturnValue(query({ data: null, error: null }).chain);
      expect(await service.findByIdentification('w1', 'XX')).toBeNull();
    });
  });
});
