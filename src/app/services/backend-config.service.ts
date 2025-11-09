import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BackendConfigService {
  private readonly STORAGE_KEY = 'backend-url';
  private readonly DEFAULT_URL = 'http://localhost:8080';

  private _backendUrl = signal<string>(this.loadBackendUrl());

  readonly backendUrl = this._backendUrl.asReadonly();

  private loadBackendUrl(): string {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored || this.DEFAULT_URL;
  }

  setBackendUrl(url: string): void {
    const trimmedUrl = url.trim();
    const finalUrl = trimmedUrl || this.DEFAULT_URL;
    
    this._backendUrl.set(finalUrl);
    
    if (finalUrl === this.DEFAULT_URL) {
      localStorage.removeItem(this.STORAGE_KEY);
    } else {
      localStorage.setItem(this.STORAGE_KEY, finalUrl);
    }
  }

  resetToDefault(): void {
    this._backendUrl.set(this.DEFAULT_URL);
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
