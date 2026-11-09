import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import {
  AuthorizationError,
  DataError,
  ValidationError,
  WorkshopCreationError,
} from '@core/errors';
import { SupabaseService } from '@core/supabase';
import { WorkshopService } from './workshop.service';

describe('WorkshopService.create', () => {
  const rpc = vi.fn();
  let service: WorkshopService;

  beforeEach(() => {
    rpc.mockReset();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client: { rpc } } }],
    });
    service = TestBed.inject(WorkshopService);
  });

  const input = { name: 'Taller Pérez', address: 'Av. 10', phone: '0999999999' };

  it('calls create_workshop and returns the new workshop id', async () => {
    rpc.mockResolvedValue({ data: 'w-123', error: null });

    expect(await firstValueFrom(service.create(input))).toBe('w-123');
    expect(rpc).toHaveBeenCalledWith('create_workshop', {
      p_name: 'Taller Pérez',
      p_address: 'Av. 10',
      p_phone: '0999999999',
    });
  });

  it.each([
    'user_already_has_workshop',
    'email_not_confirmed',
    'invalid_workshop_data',
    'not_authenticated',
  ])('maps the "%s" rejection to a WorkshopCreationError', async (reason) => {
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: reason } });

    const error = await firstValueFrom(service.create(input)).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(WorkshopCreationError);
    expect((error as WorkshopCreationError).reason).toBe(reason);
  });

  it('maps any other database error through mapSupabaseError', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(firstValueFrom(service.create(input))).rejects.toBeInstanceOf(DataError);

    rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'check' } });
    await expect(firstValueFrom(service.create(input))).rejects.toBeInstanceOf(ValidationError);

    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'denied' } });
    await expect(firstValueFrom(service.create(input))).rejects.toBeInstanceOf(AuthorizationError);
  });
});

describe('WorkshopService.update', () => {
  const row = {
    id: 'w1',
    name: 'Taller Pérez',
    address: 'Av. 10',
    phone: '0999999999',
    logo_url: 'https://x.test/logos/w1/a.png',
    capacity: 6,
    min_intake_photos: 4,
    quote_expiration_days: 10,
    warranty_days: 30,
    currency: 'USD',
    timezone: 'America/Guayaquil',
  };
  const single = vi.fn();
  const eq = vi.fn(() => ({ select: () => ({ single }) }));
  const update = vi.fn(() => ({ eq }));
  let service: WorkshopService;

  beforeEach(() => {
    single.mockReset();
    update.mockClear();
    eq.mockClear();
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client: { from: () => ({ update }) } } }],
    });
    service = TestBed.inject(WorkshopService);
  });

  it('sends only the changed fields, in column naming, and returns the saved workshop', async () => {
    single.mockResolvedValue({ data: row, error: null });

    const saved = await firstValueFrom(
      service.update('w1', { name: 'Taller Pérez', warrantyDays: 30, logoUrl: null }),
    );

    expect(update).toHaveBeenCalledWith({
      name: 'Taller Pérez',
      warranty_days: 30,
      logo_url: null,
    });
    expect(eq).toHaveBeenCalledWith('id', 'w1');
    expect(saved).toMatchObject({
      id: 'w1',
      name: 'Taller Pérez',
      logoUrl: 'https://x.test/logos/w1/a.png',
      warrantyDays: 30,
      quoteExpirationDays: 10,
    });
  });

  it('maps every editable field', async () => {
    single.mockResolvedValue({ data: row, error: null });
    await firstValueFrom(
      service.update('w1', {
        name: 'n',
        address: 'a',
        phone: 'p',
        logoUrl: 'u',
        capacity: 1,
        minIntakePhotos: 2,
        quoteExpirationDays: 3,
        warrantyDays: 4,
        currency: 'EUR',
        timezone: 'UTC',
      }),
    );
    expect(update).toHaveBeenCalledWith({
      name: 'n',
      address: 'a',
      phone: 'p',
      logo_url: 'u',
      capacity: 1,
      min_intake_photos: 2,
      quote_expiration_days: 3,
      warranty_days: 4,
      currency: 'EUR',
      timezone: 'UTC',
    });
  });

  it('reports a missing row (not the owner) as AuthorizationError', async () => {
    single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: '0 rows' } });
    await expect(firstValueFrom(service.update('w1', { name: 'x' }))).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it('maps constraint violations and other errors', async () => {
    single.mockResolvedValue({ data: null, error: { code: '23514', message: 'check' } });
    await expect(firstValueFrom(service.update('w1', { capacity: 0 }))).rejects.toBeInstanceOf(
      ValidationError,
    );
    single.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(firstValueFrom(service.update('w1', { name: 'x' }))).rejects.toBeInstanceOf(
      DataError,
    );
  });
});
