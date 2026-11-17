import { Component, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Input } from '../input/input';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';

/** Espera, en milisegundos, tras la última tecla antes de lanzar la búsqueda. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Campo de búsqueda con espera: emite `search` con el texto (sin espacios sobrantes) cuando el
 * usuario deja de escribir, y solo si cambió respecto a lo último emitido. Lo usan todas las
 * listas con búsqueda (clientes, vehículos…).
 */
@Component({
  selector: 'app-search-box',
  imports: [Input],
  templateUrl: './search-box.html',
})
export class SearchBox {
  readonly label = input('Buscar');
  readonly placeholder = input('');
  readonly hint = input('');
  /** Texto con el que arranca el campo (p. ej. la búsqueda de la que se vuelve del detalle). */
  readonly initial = input('');

  readonly search = output<string>();

  private readonly typed = new Subject<string>();

  constructor() {
    this.typed
      .pipe(
        map((text) => text.trim()),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((text) => this.search.emit(text));
  }

  onInput(text: string): void {
    this.typed.next(text);
  }
}
