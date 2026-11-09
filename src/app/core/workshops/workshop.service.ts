import { Injectable, inject } from '@angular/core';
import { WorkshopCreationError, WorkshopCreationReason, mapSupabaseError } from '@core/errors';
import { Workshop } from './workshop.model';
import { SupabaseService } from '@core/supabase';
import { Observable, from, map } from 'rxjs';

interface WorkshopRow {
  id: string;
  name: string;
  address: string;
  phone: string;
  logo_url: string | null;
  capacity: number;
  min_intake_photos: number;
  quote_expiration_days: number;
  warranty_days: number;
  currency: string;
  timezone: string;
}

@Injectable({ providedIn: 'root' })
export class WorkshopService {
  private readonly supabase = inject(SupabaseService).client;

  listMine(): Observable<Workshop[]> {
    return from(
      this.supabase.from('workshops').select('*').is('deleted_at', null).returns<WorkshopRow[]>(),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw mapSupabaseError(error);
        return (data ?? []).map((row) => this.toDomain(row));
      }),
    );
  }

  /**
   * Crea el taller propio del usuario autenticado y lo deja como `owner` (UC-WS-08).
   * Devuelve el id del taller. `WorkshopCreationError` indica el motivo del rechazo.
   */
  create(input: { name: string; address: string; phone: string }): Observable<string> {
    return from(
      this.supabase.rpc('create_workshop', {
        p_name: input.name,
        p_address: input.address,
        p_phone: input.phone,
      }),
    ).pipe(
      map(({ data, error }) => {
        if (error) throw this.toCreationError(error);
        return data as string;
      }),
    );
  }

  private toCreationError(error: { code?: string; message: string }): Error {
    const reasons: WorkshopCreationReason[] = [
      'user_already_has_workshop',
      'email_not_confirmed',
      'invalid_workshop_data',
      'not_authenticated',
    ];
    const reason = reasons.find((r) => error.message.includes(r));
    return reason ? new WorkshopCreationError(reason) : mapSupabaseError(error);
  }

  private toDomain(row: WorkshopRow): Workshop {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      logoUrl: row.logo_url,
      capacity: row.capacity,
      minIntakePhotos: row.min_intake_photos,
      quoteExpirationDays: row.quote_expiration_days,
      warrantyDays: row.warranty_days,
      currency: row.currency,
      timezone: row.timezone,
    };
  }
}
