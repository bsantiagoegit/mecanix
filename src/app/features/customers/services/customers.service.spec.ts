import { TestBed } from '@angular/core/testing';
import { DataError } from '@core/errors';
import { SupabaseService } from '@core/supabase';
import { CUSTOMER_PAGE_SIZE } from '../models/customer.model';
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

describe('CustomersService', () => {
  const rpc = vi.fn();
  let service: CustomersService;

  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: [], error: null });
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client: { rpc } } }],
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
});
