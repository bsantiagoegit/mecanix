import { TestBed } from '@angular/core/testing';
import { DataError } from '@core/errors';
import { SupabaseService } from '@core/supabase';
import { VEHICLE_PAGE_SIZE } from '../models/vehicle.model';
import { VehiclesService } from './vehicles.service';

const row = (n: number, over: Record<string, unknown> = {}) => ({
  id: `v${n}`,
  license_plate: `PBA-000${n}`,
  make: 'Chevrolet',
  model: 'Spark',
  year: 2018,
  vin: null,
  has_key: true,
  key_code: '4821',
  owner_id: `c${n}`,
  owner_first_name: 'Carlos',
  owner_last_name: 'Cliente',
  ...over,
});

describe('VehiclesService', () => {
  const rpc = vi.fn();
  let service: VehiclesService;

  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: [], error: null });
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client: { rpc } } }],
    });
    service = TestBed.inject(VehiclesService);
  });

  it('calls search_vehicles with the workshop, the text and one extra row to detect more pages', async () => {
    await service.search('w1', 'pba 12');

    expect(rpc).toHaveBeenCalledWith('search_vehicles', {
      p_workshop_id: 'w1',
      p_query: 'pba 12',
      p_limit: VEHICLE_PAGE_SIZE + 1,
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
    expect(rpc).toHaveBeenCalledWith('search_vehicles', {
      p_workshop_id: 'w1',
      p_query: 'x',
      p_limit: 11,
      p_offset: 40,
    });
  });

  it('maps the rows to vehicles with their owner', async () => {
    rpc.mockResolvedValue({ data: [row(1, { vin: '1HGBH41JXMN109186' })], error: null });

    const page = await service.search('w1', '');

    expect(page.items).toEqual([
      {
        id: 'v1',
        licensePlate: 'PBA-0001',
        make: 'Chevrolet',
        model: 'Spark',
        year: 2018,
        vin: '1HGBH41JXMN109186',
        hasKey: true,
        keyCode: '4821',
        owner: { id: 'c1', firstName: 'Carlos', lastName: 'Cliente' },
      },
    ]);
  });

  it('leaves the owner null for a vehicle that has none', async () => {
    rpc.mockResolvedValue({
      data: [row(2, { owner_id: null, owner_first_name: null, owner_last_name: null })],
      error: null,
    });
    expect((await service.search('w1', '')).items[0].owner).toBeNull();
  });

  it('maps a vehicle without a key', async () => {
    rpc.mockResolvedValue({ data: [row(3, { has_key: false, key_code: null })], error: null });
    expect((await service.search('w1', '')).items[0]).toMatchObject({
      hasKey: false,
      keyCode: null,
    });
  });

  it('says there are more pages when the extra row arrives, and does not return it', async () => {
    rpc.mockResolvedValue({
      data: Array.from({ length: VEHICLE_PAGE_SIZE + 1 }, (_, i) => row(i)),
      error: null,
    });

    const page = await service.search('w1', '');

    expect(page.items).toHaveLength(VEHICLE_PAGE_SIZE);
    expect(page.hasMore).toBe(true);
  });

  it('says there are no more pages when the answer fits', async () => {
    rpc.mockResolvedValue({ data: [row(1), row(2)], error: null });
    expect(await service.search('w1', '')).toMatchObject({ hasMore: false });
  });

  it('returns an empty page when there is no data', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await service.search('w1', '')).toEqual({ items: [], hasMore: false });
  });

  it('throws a mapped error when the call fails', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '500', message: 'boom' } });
    await expect(service.search('w1', '')).rejects.toBeInstanceOf(DataError);
  });
});
