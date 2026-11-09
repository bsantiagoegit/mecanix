import { TestBed } from '@angular/core/testing';
import { Workshop, WorkshopService } from '@core/workshops';
import { of, throwError } from 'rxjs';
import { WorkshopLogoService } from './workshop-logo.service';
import { WorkshopSettingsService } from './workshop-settings.service';

const workshop = (logoUrl: string | null): Workshop => ({
  id: 'w1',
  name: 'Taller',
  address: 'a',
  phone: 'p',
  logoUrl,
  capacity: 4,
  minIntakePhotos: 4,
  quoteExpirationDays: 7,
  warrantyDays: 14,
  currency: 'USD',
  timezone: 'America/Guayaquil',
});

describe('WorkshopSettingsService', () => {
  const update = vi.fn();
  const upload = vi.fn();
  const remove = vi.fn();
  let service: WorkshopSettingsService;
  const file = new File(['x'], 'logo.png', { type: 'image/png' });

  beforeEach(() => {
    update
      .mockReset()
      .mockImplementation((_id: string, changes: { logoUrl?: string | null }) =>
        of({ ...workshop(changes.logoUrl === undefined ? 'old' : changes.logoUrl), name: 'Nuevo' }),
      );
    upload.mockReset().mockResolvedValue('https://x/new.png');
    remove.mockReset().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: WorkshopService, useValue: { update } },
        { provide: WorkshopLogoService, useValue: { upload, remove } },
      ],
    });
    service = TestBed.inject(WorkshopSettingsService);
  });

  it('saves the data without touching the logo when it did not change', async () => {
    const saved = await service.save(workshop('old'), { name: 'Nuevo' });

    expect(update).toHaveBeenCalledWith('w1', { name: 'Nuevo' });
    expect(upload).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(saved.name).toBe('Nuevo');
  });

  it('uploads the new logo, saves its URL and removes the previous file', async () => {
    const saved = await service.save(
      workshop('https://x/old.png'),
      { name: 'Nuevo' },
      { file, remove: false },
    );

    expect(upload).toHaveBeenCalledWith('w1', file);
    expect(update).toHaveBeenCalledWith('w1', { name: 'Nuevo', logoUrl: 'https://x/new.png' });
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('https://x/old.png');
    expect(saved.logoUrl).toBe('https://x/new.png');
  });

  it('does not try to remove a previous logo when there was none', async () => {
    await service.save(workshop(null), {}, { file, remove: false });
    expect(remove).not.toHaveBeenCalled();
  });

  it('clears the logo and removes the old file when asked to', async () => {
    const saved = await service.save(
      workshop('https://x/old.png'),
      {},
      { file: null, remove: true },
    );

    expect(update).toHaveBeenCalledWith('w1', { logoUrl: null });
    expect(remove).toHaveBeenCalledWith('https://x/old.png');
    expect(saved.logoUrl).toBeNull();
  });

  it('a new file wins over "remove"', async () => {
    await service.save(workshop('https://x/old.png'), {}, { file, remove: true });
    expect(update).toHaveBeenCalledWith('w1', { logoUrl: 'https://x/new.png' });
  });

  it('removes the freshly uploaded logo if saving the workshop fails, and keeps the old one', async () => {
    const failure = new Error('db down');
    update.mockReturnValue(throwError(() => failure));

    await expect(
      service.save(workshop('https://x/old.png'), { name: 'Nuevo' }, { file, remove: false }),
    ).rejects.toBe(failure);

    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledWith('https://x/new.png');
  });

  it('saves nothing when the upload fails', async () => {
    upload.mockRejectedValue(new Error('upload'));
    await expect(
      service.save(workshop(null), { name: 'x' }, { file, remove: false }),
    ).rejects.toThrow('upload');
    expect(update).not.toHaveBeenCalled();
  });
});
