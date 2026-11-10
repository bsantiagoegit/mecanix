import { Injectable, inject, signal } from '@angular/core';
import { NotFoundError } from '@core/errors';
import { IdentificationConflict, PhoneWarning } from '../components/customer-form/customer-form';
import { Customer } from '../models/customer.model';
import { DuplicateIdentificationError } from '../models/duplicate-identification.error';
import { CustomersService } from './customers.service';

/** Resultado de guardar: el cliente guardado, o por qué no se pudo. */
export type SaveResult =
  { ok: true; customer: Customer } | { ok: false; reason: 'conflict' | 'not-found' | 'failed' };

/**
 * Estado local de un formulario de cliente en uso (registrar o editar): qué se está guardando,
 * el aviso de teléfono repetido y el choque de identificación. Lo comparten el alta (en el modal
 * de la lista) y la edición (su página); se provee en cada componente, no es global.
 */
@Injectable()
export class CustomerFormState {
  private readonly customers = inject(CustomersService);

  readonly isSubmitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly phoneWarning = signal<PhoneWarning | null>(null);
  readonly conflict = signal<IdentificationConflict | null>(null);

  /** Se descarta el resultado de una comprobación de teléfono que ya quedó atrás. */
  private phoneCheck = 0;

  /** Vuelve al estado de un formulario nuevo (p. ej. al abrir el modal otra vez). */
  reset(): void {
    this.phoneCheck++;
    this.isSubmitting.set(false);
    this.error.set(null);
    this.phoneWarning.set(null);
    this.conflict.set(null);
  }

  /**
   * Al salir del teléfono: aviso (no bloquea) si otros clientes del taller ya lo usan.
   * Editando, `excludeId` deja fuera al propio cliente y `ownPhone` es el teléfono que ya tenía:
   * no es un duplicado nuevo.
   */
  async checkPhone(
    workshopId: string,
    phone: string,
    options: { excludeId?: string; ownPhone?: string } = {},
  ): Promise<void> {
    if (phone === options.ownPhone) {
      this.phoneWarning.set(null);
      return;
    }

    const check = ++this.phoneCheck;
    try {
      const matches = await this.customers.findByPhone(workshopId, phone, options.excludeId);
      if (check === this.phoneCheck) this.phoneWarning.set({ phone, matches });
    } catch {
      // El aviso es opcional: si no se puede consultar, el usuario sigue y la base decide al guardar.
    }
  }

  /**
   * Ejecuta el guardado y deja el estado listo para mostrar el resultado. Un fallo no toca el
   * formulario: se conserva lo escrito para reintentar.
   */
  async save(save: () => Promise<Customer>, failureMessage: string): Promise<SaveResult> {
    this.isSubmitting.set(true);
    this.error.set(null);
    this.conflict.set(null);
    try {
      const customer = await save();
      return { ok: true, customer };
    } catch (err) {
      if (err instanceof DuplicateIdentificationError) {
        this.conflict.set({ identification: err.identification, existing: err.existing });
        return { ok: false, reason: 'conflict' };
      }
      if (err instanceof NotFoundError) return { ok: false, reason: 'not-found' };
      this.error.set(failureMessage);
      return { ok: false, reason: 'failed' };
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
