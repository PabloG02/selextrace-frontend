import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BackendConfigService } from './backend-config.service';
import { SystemRole, UserSummary } from '../models/auth';

@Injectable({ providedIn: 'root' })
export class AdminUsersApiService {
  private readonly http = inject(HttpClient);
  private readonly backendConfig = inject(BackendConfigService);
  private readonly baseUrl = computed(() => `${this.backendConfig.backendUrl()}/api/admin/users`);

  getUsersRes() {
    return httpResource<UserSummary[]>(() => this.baseUrl());
  }

  updateRole(userId: string, systemRole: SystemRole): Observable<UserSummary> {
    return this.http.patch<UserSummary>(`${this.baseUrl()}/${userId}/role`, { systemRole });
  }

  updateActive(userId: string, active: boolean): Observable<UserSummary> {
    return this.http.patch<UserSummary>(`${this.baseUrl()}/${userId}/active`, { active });
  }

  resetPassword(userId: string, newPassword: string): Observable<UserSummary> {
    return this.http.post<UserSummary>(`${this.baseUrl()}/${userId}/reset-password`, { newPassword });
  }
}
