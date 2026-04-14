import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, map, Observable, of, tap } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthResponse, AuthUser, CsrfResponse, SystemRole } from '../models/auth';
import { BackendConfigService } from './backend-config.service';

interface CredentialsPayload {
  email: string;
  password: string;
}

interface SignupPayload extends CredentialsPayload {
  displayName: string;
}

interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

const CSRF_TOKEN_STORAGE_KEY = 'csrf-token';
const CSRF_HEADER_NAME_STORAGE_KEY = 'csrf-header-name';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly backendConfig = inject(BackendConfigService);

  readonly currentUser = signal<AuthUser | null>(null);
  readonly initialized = signal(false);
  readonly isBusy = signal(false);

  readonly apiBaseUrl = computed(() => `${this.backendConfig.backendUrl()}/api`);
  readonly isAuthenticated = computed(() => this.currentUser() !== null);
  readonly systemRole = computed<SystemRole | null>(() => this.currentUser()?.systemRole ?? null);
  readonly isAdmin = computed(() => this.systemRole() === 'PLATFORM_ADMIN');
  readonly canCreateExperiments = computed(() => {
    const role = this.systemRole();
    return role === 'PLATFORM_ADMIN' || role === 'EXPERIMENT_MANAGER';
  });
  readonly mustChangePassword = computed(() => this.currentUser()?.mustChangePassword ?? false);

  async initialize(): Promise<void> {
    if (this.initialized()) {
      return;
    }
    await firstValueFrom(
      this.ensureCsrfToken().pipe(
        catchError(() => of(void 0)),
        map(() => void 0),
      ),
    );
    await firstValueFrom(this.refreshSession());
    this.initialized.set(true);
  }

  ensureCsrfToken(): Observable<void> {
    return this.http
      .get<CsrfResponse>(`${this.apiBaseUrl()}/auth/csrf`)
      .pipe(
        tap((response) => this.storeCsrfMetadata(response)),
        map(() => void 0),
      );
  }

  refreshSession(): Observable<AuthUser | null> {
    return this.http.get<AuthResponse>(`${this.apiBaseUrl()}/auth/me`).pipe(
      map((response) => response.user),
      tap((user) => this.currentUser.set(user)),
      catchError(() => {
        this.currentUser.set(null);
        return of(null);
      }),
    );
  }

  login(payload: CredentialsPayload): Observable<AuthUser> {
    return this.ensureCsrfToken().pipe(
      tap(() => this.isBusy.set(true)),
      switchMap(() => this.http.post<AuthResponse>(`${this.apiBaseUrl()}/auth/login`, payload)),
      map((response) => response.user),
      tap((user) => {
        this.currentUser.set(user);
        this.isBusy.set(false);
      }),
      catchError((error) => {
        this.isBusy.set(false);
        throw error;
      }),
    );
  }

  signup(payload: SignupPayload): Observable<AuthUser> {
    return this.ensureCsrfToken().pipe(
      tap(() => this.isBusy.set(true)),
      switchMap(() => this.http.post<AuthResponse>(`${this.apiBaseUrl()}/auth/signup`, payload)),
      map((response) => response.user),
      tap((user) => {
        this.currentUser.set(user);
        this.isBusy.set(false);
      }),
      catchError((error) => {
        this.isBusy.set(false);
        throw error;
      }),
    );
  }

  logout(): Observable<void> {
    return this.ensureCsrfToken().pipe(
      switchMap(() => this.http.post<void>(`${this.apiBaseUrl()}/auth/logout`, {})),
      tap(() => this.currentUser.set(null)),
    );
  }

  changePassword(payload: ChangePasswordPayload): Observable<AuthUser> {
    return this.ensureCsrfToken().pipe(
      switchMap(() => this.http.post<AuthResponse>(`${this.apiBaseUrl()}/auth/change-password`, payload)),
      map((response) => response.user),
      tap((user) => this.currentUser.set(user)),
    );
  }

  private storeCsrfMetadata(response: CsrfResponse): void {
    try {
      sessionStorage.setItem(CSRF_TOKEN_STORAGE_KEY, response.token);
      sessionStorage.setItem(CSRF_HEADER_NAME_STORAGE_KEY, response.headerName || 'X-XSRF-TOKEN');
    } catch {
      // Ignore storage failures and rely on cookie-based CSRF handling.
    }
  }
}
