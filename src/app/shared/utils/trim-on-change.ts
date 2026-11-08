import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl } from '@angular/forms';

/**
 * Quita los espacios de los extremos mientras el usuario escribe o pega, para que un
 * espacio sobrante no invalide el campo. Llamar en un contexto de inyección (constructor).
 */
export function trimOnChange(control: AbstractControl, destroyRef = inject(DestroyRef)): void {
  control.valueChanges.pipe(takeUntilDestroyed(destroyRef)).subscribe((value: unknown) => {
    if (typeof value === 'string' && value !== value.trim()) {
      control.setValue(value.trim(), { emitEvent: false });
    }
  });
}
