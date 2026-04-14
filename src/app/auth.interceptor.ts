import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BackendConfigService } from './services/backend-config.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_TOKEN_STORAGE_KEY = 'csrf-token';
const CSRF_HEADER_NAME_STORAGE_KEY = 'csrf-header-name';
const DEFAULT_CSRF_HEADER_NAME = 'X-XSRF-TOKEN';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const backendConfig = inject(BackendConfigService);
  const backendUrl = backendConfig.backendUrl();
  if (!req.url.startsWith(backendUrl)) {
    return next(req);
  }

  const headers: Record<string, string> = {};
  if (MUTATING_METHODS.has(req.method)) {
    const csrfToken = readStoredCsrfToken() ?? readCookie('XSRF-TOKEN');
    if (csrfToken) {
      headers[readStoredCsrfHeaderName()] = csrfToken;
    }
  }

  return next(req.clone({
    withCredentials: true,
    setHeaders: headers,
  }));
};

function readCookie(name: string): string | null {
  const cookies = document.cookie.split(';');
  const prefix = `${name}=`;
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function readStoredCsrfToken(): string | null {
  try {
    return sessionStorage.getItem(CSRF_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function readStoredCsrfHeaderName(): string {
  try {
    return sessionStorage.getItem(CSRF_HEADER_NAME_STORAGE_KEY) || DEFAULT_CSRF_HEADER_NAME;
  } catch {
    return DEFAULT_CSRF_HEADER_NAME;
  }
}
