import { Injectable, inject } from '@angular/core';
import { Observable, from, map } from 'rxjs';
import { SupabaseService } from '../supabase';
import { Role, User } from './auth.models';

interface LoginResult {
  user: User;
  role: Role;
  activeWorkshopId: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService).client;

  login(email: string, password: string): Observable<LoginResult> {
    return from(this.supabase.auth.signInWithPassword({ email, password })).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        if (!data.user) throw new Error('No user');

        // TODO: fetch role and workshop from workshop_members
        return {
          user: {
            id: data.user.id,
            email: data.user.email!,
            fullName: data.user.user_metadata['full_name'] ?? '',
            phone: data.user.user_metadata['phone'] ?? null,
          },
          role: 'owner' as Role,
          activeWorkshopId: '',
        };
      }),
    );
  }

  logout(): Promise<void> {
    return this.supabase.auth.signOut().then(() => undefined);
  }
}
