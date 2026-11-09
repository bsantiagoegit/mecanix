import { Injectable, inject } from '@angular/core';
import { Workshop, WorkshopChanges, WorkshopService } from '@core/workshops';
import { firstValueFrom } from 'rxjs';
import { WorkshopLogoService } from './workshop-logo.service';

export interface LogoChange {
  /** Archivo nuevo elegido por el usuario. */
  file: File | null;
  /** Quitar el logo actual (se ignora si hay `file`). */
  remove: boolean;
}

/**
 * Guarda la configuración del taller junto con su logo (UC-WS-02).
 * Orden: sube el logo nuevo → actualiza el taller → elimina el logo anterior. Si falla la
 * actualización se elimina el logo recién subido, para no dejar archivos huérfanos.
 */
@Injectable({ providedIn: 'root' })
export class WorkshopSettingsService {
  private readonly workshops = inject(WorkshopService);
  private readonly logos = inject(WorkshopLogoService);

  async save(
    current: Workshop,
    changes: WorkshopChanges,
    logo: LogoChange = { file: null, remove: false },
  ): Promise<Workshop> {
    let uploadedUrl: string | null = null;
    const next: WorkshopChanges = { ...changes };

    if (logo.file) {
      uploadedUrl = await this.logos.upload(current.id, logo.file);
      next.logoUrl = uploadedUrl;
    } else if (logo.remove) {
      next.logoUrl = null;
    }

    let updated: Workshop;
    try {
      updated = await firstValueFrom(this.workshops.update(current.id, next));
    } catch (error) {
      if (uploadedUrl) await this.logos.remove(uploadedUrl);
      throw error;
    }

    if (current.logoUrl && current.logoUrl !== updated.logoUrl) {
      await this.logos.remove(current.logoUrl);
    }
    return updated;
  }
}
