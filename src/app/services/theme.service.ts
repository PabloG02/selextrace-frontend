import {Injectable, signal, effect, computed} from '@angular/core';

export type Theme = 'light' | 'dark' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';

  readonly theme = signal<Theme>(this.getStoredTheme());

  constructor() {
    // Apply theme whenever it changes
    effect(() => {
      this.applyTheme(this.theme());
    });
  }

  private getStoredTheme(): Theme {
    const stored = localStorage.getItem(this.THEME_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'auto') {
      return stored;
    }
    return 'auto';
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    localStorage.setItem(this.THEME_KEY, theme);
  }

  private applyTheme(theme: Theme): void {
    const body = document.body;

    if (theme === 'auto') {
      body.style.colorScheme = 'light dark';
    } else {
      body.style.colorScheme = theme;
    }
  }

  readonly echartsTheme = computed(() => {
    const selected = this.theme();

    if (selected === 'dark')
      return 'dark';

    return 'default';
  });
}
