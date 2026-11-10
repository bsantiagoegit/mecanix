import { Component, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Input } from '@shared/components/input/input';
import { Subject, debounceTime, distinctUntilChanged, map } from 'rxjs';

/** Espera, en milisegundos, tras la última tecla antes de lanzar la búsqueda. */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Campo de búsqueda con espera: emite `search` con el texto (sin espacios sobrantes) cuando el
 * usuario deja de escribir, y solo si cambió respecto a lo último emitido.
 */
@Component({
  selector: 'app-customer-search',
  imports: [Input],
  templateUrl: './customer-search.html',
})
export class CustomerSearch {
  readonly placeholder = input('Buscar cliente');
  readonly hint = input('');

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
