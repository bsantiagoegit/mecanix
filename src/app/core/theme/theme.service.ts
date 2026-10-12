import { Injectable, effect, signal } from '@angular/core';
import { Theme } from './theme.models';

const STORAGE_KEY = 'theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>('system');

  readonly theme = this._theme.asReadonly();

  constructor() {
    effect(() => this.applyTheme(this._theme()));
  }

  init(): void {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved) {
      this._theme.set(saved);
    }
  }

  setTheme(theme: Theme): void {
    this._theme.set(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  private applyTheme(theme: Theme): void {
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    document.documentElement.dataset['theme'] = isDark ? 'dark' : 'light';

    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', isDark ? '#020617' : '#ffffff');
  }
}
