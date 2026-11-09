import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '@core/supabase';
import { resizeImage } from '@shared/utils/image-resize';

const BUCKET = 'logos';
const PUBLIC_MARKER = `/object/public/${BUCKET}/`;

/** Igual que los límites del bucket `logos` (ADR-014). */
export const LOGO_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
/** Tamaño máximo del archivo original; después se redimensiona. */
export const LOGO_MAX_ORIGINAL_BYTES = 5 * 1024 * 1024;
/** Tamaño máximo tras redimensionar (límite del bucket). */
export const LOGO_MAX_UPLOAD_BYTES = 1024 * 1024;

export type LogoErrorReason = 'invalid_type' | 'too_large' | 'upload_failed';

export class LogoError extends Error {
  constructor(public readonly reason: LogoErrorReason) {
    super(`Logo error: ${reason}`);
    this.name = 'LogoError';
  }
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Sube y elimina el logo del taller en el bucket público `logos` (ADR-014). */
@Injectable({ providedIn: 'root' })
export class WorkshopLogoService {
  private readonly storage = inject(SupabaseService).client.storage.from(BUCKET);

  /** `null` si el archivo es admisible; si no, el motivo. */
  validate(file: File): LogoErrorReason | null {
    if (!LOGO_ALLOWED_TYPES.includes(file.type)) return 'invalid_type';
    if (file.size > LOGO_MAX_ORIGINAL_BYTES) return 'too_large';
    return null;
  }

  /**
   * Redimensiona el logo, lo sube a `{workshopId}/{uuid}.{ext}` y devuelve su URL pública.
   * Cada subida es un archivo nuevo: la URL cambia con el logo y no queda caché obsoleta.
   */
  async upload(workshopId: string, file: File): Promise<string> {
    const invalid = this.validate(file);
    if (invalid) throw new LogoError(invalid);

    let blob: Blob;
    try {
      blob = await this.resize(file);
    } catch {
      throw new LogoError('upload_failed');
    }
    if (blob.size > LOGO_MAX_UPLOAD_BYTES) throw new LogoError('too_large');

    const path = `${workshopId}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;
    const { error } = await this.storage.upload(path, blob, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new LogoError('upload_failed');

    return this.storage.getPublicUrl(path).data.publicUrl;
  }

  /** Aislado para poder sustituirlo en las pruebas (el canvas no existe fuera del navegador). */
  protected resize(file: File): Promise<Blob> {
    return resizeImage(file);
  }

  /**
   * Elimina el archivo de un logo a partir de su URL pública. Es de mejor esfuerzo: un
   * fallo deja un archivo huérfano pero nunca debe romper el guardado (ver ADR-014).
   */
  async remove(logoUrl: string | null): Promise<void> {
    const path = this.pathFromUrl(logoUrl);
    if (!path) return;
    try {
      await this.storage.remove([path]);
    } catch {
      // Huérfano tolerado.
    }
  }

  private pathFromUrl(url: string | null): string | null {
    if (!url) return null;
    const index = url.indexOf(PUBLIC_MARKER);
    if (index === -1) return null;
    const raw = url.slice(index + PUBLIC_MARKER.length).split('?')[0];
    return raw ? decodeURIComponent(raw) : null;
  }
}
