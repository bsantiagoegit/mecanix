import { TestBed } from '@angular/core/testing';
import { SupabaseService } from '@core/supabase';
import { LogoError, WorkshopLogoService } from './workshop-logo.service';

describe('WorkshopLogoService', () => {
  const upload = vi.fn();
  const remove = vi.fn();
  const getPublicUrl = vi.fn((path: string) => ({
    data: { publicUrl: `http://127.0.0.1:54321/storage/v1/object/public/logos/${path}` },
  }));
  const from = vi.fn(() => ({ upload, remove, getPublicUrl }));
  let service: WorkshopLogoService;
  const resize = vi.fn();

  const file = (type = 'image/png', size = 1000) => {
    const f = new File(['x'], 'logo', { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  beforeEach(() => {
    upload.mockReset().mockResolvedValue({ error: null });
    remove.mockReset().mockResolvedValue({ error: null });
    from.mockClear();
    resize.mockReset().mockResolvedValue(new Blob(['small'], { type: 'image/png' }));
    TestBed.configureTestingModule({
      providers: [{ provide: SupabaseService, useValue: { client: { storage: { from } } } }],
    });
    service = TestBed.inject(WorkshopLogoService);
    vi.spyOn(service as unknown as { resize: typeof resize }, 'resize').mockImplementation(resize);
  });

  describe('validate', () => {
    it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
      expect(service.validate(file(type))).toBeNull();
    });

    it.each(['image/svg+xml', 'image/gif', 'application/pdf', ''])(
      'rejects the type "%s"',
      (type) => {
        expect(service.validate(file(type))).toBe('invalid_type');
      },
    );

    it('rejects an original over 5 MB', () => {
      expect(service.validate(file('image/png', 5 * 1024 * 1024 + 1))).toBe('too_large');
      expect(service.validate(file('image/png', 5 * 1024 * 1024))).toBeNull();
    });
  });

  describe('upload', () => {
    it('uploads the resized image to {workshopId}/{uuid}.{ext} and returns the public URL', async () => {
      const url = await service.upload('w1', file('image/webp'));

      expect(from).toHaveBeenCalledWith('logos');
      const [path, blob, options] = upload.mock.calls[0];
      expect(path).toMatch(/^w1\/[0-9a-f-]{36}\.webp$/);
      expect(blob).toBeInstanceOf(Blob);
      expect(options).toEqual({ contentType: 'image/webp', upsert: false });
      expect(url).toBe(`http://127.0.0.1:54321/storage/v1/object/public/logos/${path}`);
    });

    it('uses a new path on every upload (never overwrites)', async () => {
      await service.upload('w1', file());
      await service.upload('w1', file());
      expect(upload.mock.calls[0][0]).not.toBe(upload.mock.calls[1][0]);
    });

    it('rejects invalid files before touching the network', async () => {
      await expect(service.upload('w1', file('image/svg+xml'))).rejects.toMatchObject({
        reason: 'invalid_type',
      });
      expect(upload).not.toHaveBeenCalled();
    });

    it('rejects an image that is still over 1 MB after resizing', async () => {
      resize.mockResolvedValue(new Blob([new Uint8Array(1024 * 1024 + 1)]));
      await expect(service.upload('w1', file())).rejects.toMatchObject({ reason: 'too_large' });
      expect(upload).not.toHaveBeenCalled();
    });

    it('reports an undecodable image as an upload failure', async () => {
      resize.mockRejectedValue(new Error('bad'));
      await expect(service.upload('w1', file())).rejects.toBeInstanceOf(LogoError);
    });

    it('reports a Storage error as an upload failure', async () => {
      upload.mockResolvedValue({ error: { message: 'denied' } });
      await expect(service.upload('w1', file())).rejects.toMatchObject({ reason: 'upload_failed' });
    });
  });

  describe('remove', () => {
    const publicUrl = (path: string) =>
      `http://127.0.0.1:54321/storage/v1/object/public/logos/${path}`;

    it('removes the object a public URL points to', async () => {
      await service.remove(publicUrl('w1/abc.png'));
      expect(remove).toHaveBeenCalledWith(['w1/abc.png']);
    });

    it('ignores a query string and decodes the path', async () => {
      await service.remove(`${publicUrl('w1/a%20b.png')}?t=1`);
      expect(remove).toHaveBeenCalledWith(['w1/a b.png']);
    });

    it.each([null, '', 'https://example.com/logo.png'])('does nothing for %s', async (url) => {
      await service.remove(url);
      expect(remove).not.toHaveBeenCalled();
    });

    it('never throws when the deletion fails (an orphan is tolerated)', async () => {
      remove.mockRejectedValue(new Error('network'));
      await expect(service.remove(publicUrl('w1/abc.png'))).resolves.toBeUndefined();
    });
  });
});
