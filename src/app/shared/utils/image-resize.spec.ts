import { fitWithin, resizeImage } from './image-resize';

describe('fitWithin', () => {
  it.each([
    [1024, 512, 512, { width: 512, height: 256 }],
    [512, 1024, 512, { width: 256, height: 512 }],
    [2000, 2000, 512, { width: 512, height: 512 }],
    [300, 200, 512, { width: 300, height: 200 }],
    [512, 512, 512, { width: 512, height: 512 }],
    [10000, 1, 512, { width: 512, height: 1 }],
  ])('%ix%i within %i → %o', (w, h, max, expected) => {
    expect(fitWithin(w, h, max)).toEqual(expected);
  });
});

describe('resizeImage', () => {
  const drawImage = vi.fn();
  const close = vi.fn();

  function stubBrowser(options: {
    bitmap?: { width: number; height: number };
    blob?: Blob | null;
  }) {
    const bitmap = { ...(options.bitmap ?? { width: 1024, height: 512 }), close };
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(bitmap));
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (cb: (b: Blob | null) => void, type: string, quality: number) => {
        canvas.encoded = { type, quality };
        cb(options.blob === undefined ? new Blob(['x'], { type }) : options.blob);
      },
      encoded: undefined as { type: string; quality: number } | undefined,
    };
    vi.spyOn(document, 'createElement').mockReturnValue(canvas as unknown as HTMLCanvasElement);
    return { canvas, bitmap };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    drawImage.mockReset();
    close.mockReset();
  });

  const file = (type = 'image/png') => new File(['data'], 'logo', { type });

  it('shrinks the canvas to the limit and keeps the image type', async () => {
    const { canvas } = stubBrowser({});
    const blob = await resizeImage(file('image/webp'), 512);

    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(256);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 512, 256);
    expect(canvas.encoded).toEqual({ type: 'image/webp', quality: 0.9 });
    expect(blob.type).toBe('image/webp');
  });

  it('does not enlarge small images', async () => {
    const { canvas } = stubBrowser({ bitmap: { width: 100, height: 80 } });
    await resizeImage(file());
    expect([canvas.width, canvas.height]).toEqual([100, 80]);
  });

  it('releases the bitmap even when encoding fails', async () => {
    stubBrowser({ blob: null });
    await expect(resizeImage(file())).rejects.toThrow('No se pudo codificar');
    expect(close).toHaveBeenCalled();
  });

  it('fails when the browser cannot decode the file', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('bad image')));
    await expect(resizeImage(file())).rejects.toThrow('bad image');
  });
});
