import { Component, OnDestroy, computed, input, output, signal } from '@angular/core';
import { LOGO_ERROR_MESSAGES, validateLogoFile } from '../../services/workshop-logo.service';

/** Lo que el usuario decidió hacer con el logo: subir uno nuevo, quitar el actual o nada. */
export interface LogoSelection {
  file: File | null;
  remove: boolean;
}

/**
 * Selector de logo presentacional: muestra el logo actual o una vista previa del archivo
 * elegido, valida el archivo y avisa con `changed`. No sube nada: lo hace quien lo usa.
 */
@Component({
  selector: 'app-logo-picker',
  templateUrl: './logo-picker.html',
})
export class LogoPicker implements OnDestroy {
  /** URL del logo ya guardado, si hay. */
  readonly currentUrl = input<string | null>(null);

  readonly changed = output<LogoSelection>();

  readonly error = signal<string | null>(null);
  private readonly file = signal<File | null>(null);
  private readonly removeCurrent = signal(false);
  private readonly preview = signal<string | null>(null);
  private previewUrl: string | null = null;

  /** Lo que se muestra: la vista previa, el logo actual (si no se quitó) o nada. */
  readonly shown = computed(() =>
    this.removeCurrent() ? null : (this.preview() ?? this.currentUrl()),
  );

  ngOnDestroy(): void {
    this.revokePreview();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const picked = input.files?.[0] ?? null;
    input.value = '';
    if (!picked) return;

    const invalid = validateLogoFile(picked);
    if (invalid) {
      this.error.set(LOGO_ERROR_MESSAGES[invalid]);
      return;
    }
    this.error.set(null);
    this.revokePreview();
    this.previewUrl = URL.createObjectURL(picked);
    this.preview.set(this.previewUrl);
    this.file.set(picked);
    this.removeCurrent.set(false);
    this.emit();
  }

  onRemove(): void {
    this.revokePreview();
    this.preview.set(null);
    this.file.set(null);
    this.error.set(null);
    this.removeCurrent.set(this.currentUrl() !== null);
    this.emit();
  }

  /** Descarta la selección (p. ej. tras guardar) y vuelve a mostrar el logo actual. */
  reset(): void {
    this.revokePreview();
    this.preview.set(null);
    this.file.set(null);
    this.removeCurrent.set(false);
    this.error.set(null);
  }

  private emit(): void {
    this.changed.emit({ file: this.file(), remove: this.removeCurrent() });
  }

  private revokePreview(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
  }
}
