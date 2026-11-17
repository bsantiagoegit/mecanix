import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkshopFacade } from '@core/workshops';
import { Button } from '@shared/components/button/button';
import { Card } from '@shared/components/card/card';
import { SearchBox } from '@shared/components/search-box/search-box';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { VehicleCard } from '../../components/vehicle-card/vehicle-card';
import { VehicleSummary } from '../../models/vehicle.model';
import { VehiclesService } from '../../services/vehicles.service';

/**
 * UC-VEH-02: lista de vehículos del taller con búsqueda por placa o VIN y paginación. La ven los
 * tres roles; registrar y editar llegan en la siguiente rama.
 */
@Component({
  selector: 'app-vehicle-list-page',
  imports: [Button, Card, SearchBox, Skeleton, VehicleCard],
  templateUrl: './vehicle-list-page.html',
})
export class VehicleListPage {
  private readonly vehicles = inject(VehiclesService);
  private readonly workshops = inject(WorkshopFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  /** Filas del esqueleto mientras carga. */
  readonly skeletonRows = [1, 2, 3, 4, 5, 6];

  /** Búsqueda guardada en la URL (`?q=`). Con `withComponentInputBinding`, sin ella llega `undefined`. */
  readonly q = input<string | undefined>('');

  /** Texto buscado (ya sin espacios sobrantes). Vacío lista todos. */
  readonly query = signal('');
  readonly items = signal<VehicleSummary[]>([]);
  readonly hasMore = signal(false);
  readonly isLoading = signal(true);
  readonly isLoadingMore = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly moreError = signal<string | null>(null);

  /** Se descartan las respuestas de una búsqueda que ya quedó atrás (llegan desordenadas). */
  private requestId = 0;
  private loadedWorkshopId: string | null = null;

  constructor() {
    effect(() => {
      const id = this.workshops.activeId();
      const initialQuery = (this.q() ?? '').trim();
      if (id && id !== this.loadedWorkshopId) {
        this.loadedWorkshopId = id;
        untracked(() => {
          this.query.set(initialQuery);
          void this.load(id, initialQuery);
        });
      }
    });
  }

  onSearch(text: string): void {
    if (text === this.query()) return;
    this.query.set(text);
    // La búsqueda queda en la URL (sin añadir al historial) para poder volver a ella.
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: text || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    const workshopId = this.workshops.activeId();
    if (workshopId) void this.load(workshopId, text);
  }

  async loadMore(): Promise<void> {
    const workshopId = this.workshops.activeId();
    if (!workshopId || this.isLoadingMore() || !this.hasMore()) return;

    const request = this.requestId;
    this.isLoadingMore.set(true);
    this.moreError.set(null);
    try {
      const page = await this.vehicles.search(workshopId, this.query(), this.items().length);
      if (request !== this.requestId) return;
      this.items.update((current) => [...current, ...page.items]);
      this.hasMore.set(page.hasMore);
    } catch {
      if (request === this.requestId) {
        this.moreError.set('No se pudieron cargar más vehículos. Inténtalo de nuevo.');
      }
    } finally {
      if (request === this.requestId) this.isLoadingMore.set(false);
    }
  }

  retry(): void {
    const workshopId = this.workshops.activeId();
    if (workshopId) void this.load(workshopId, this.query());
  }

  private async load(workshopId: string, query: string): Promise<void> {
    const request = ++this.requestId;
    this.isLoading.set(true);
    this.isLoadingMore.set(false);
    this.loadError.set(null);
    this.moreError.set(null);
    try {
      const page = await this.vehicles.search(workshopId, query);
      if (request !== this.requestId) return;
      this.items.set(page.items);
      this.hasMore.set(page.hasMore);
    } catch {
      if (request !== this.requestId) return;
      // Un fallo no se muestra como "no hay vehículos": se avisa y se ofrece reintentar.
      this.items.set([]);
      this.hasMore.set(false);
      this.loadError.set(
        'No se pudieron cargar los vehículos. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      if (request === this.requestId) this.isLoading.set(false);
    }
  }
}
