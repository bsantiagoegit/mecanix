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
