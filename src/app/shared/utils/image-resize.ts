/** Lado máximo, en px, al que se reduce una imagen antes de subirla. */
export const DEFAULT_MAX_SIDE = 512;

/** Dimensiones que caben en `maxSide` conservando la proporción. Nunca agranda. */
export function fitWithin(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const ratio = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * Reduce la imagen a un máximo de `maxSide` px por lado y devuelve un Blob del mismo tipo
 * (la transparencia de PNG/WebP se conserva). Lanza si el navegador no puede decodificarla.
 */
export async function resizeImage(file: File, maxSide = DEFAULT_MAX_SIDE): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height, maxSide);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D no disponible');
    context.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('No se pudo codificar la imagen'))),
        file.type,
        0.9,
      ),
    );
  } finally {
    bitmap.close();
  }
}
