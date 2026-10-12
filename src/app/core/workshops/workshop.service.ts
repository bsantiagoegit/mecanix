import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase';
import { Workshop } from './workshop.models';

@Injectable({ providedIn: 'root' })
export class WorkshopService {
  private readonly supabase = inject(SupabaseService).client;

  listMine(): Observable<Workshop[]> {
    return from(this.supabase.from('workshops').select('*').is('deleted_at', null)).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        return (data ?? []).map((row) => this.toDomain(row));
      }),
    );
  }

  private toDomain(row: any): Workshop {
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
