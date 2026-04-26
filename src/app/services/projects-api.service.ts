import {HttpClient, httpResource} from '@angular/common/http';
import {computed, inject, Injectable, Signal} from '@angular/core';
import { Observable } from 'rxjs';
import { ExperimentAccessGrant, ProjectDetail, ProjectSummary } from '../models/project';
import { BackendConfigService } from './backend-config.service';
import { ResourceAccessLevel, UserSummary } from '../models/auth';

@Injectable({ providedIn: 'root' })
export class ProjectsApiService {
  private readonly http = inject(HttpClient);
  private readonly backendConfig = inject(BackendConfigService);
  private readonly baseUrl = computed(() => `${this.backendConfig.backendUrl()}/api/projects`);

  getProjectsRes() {
    return httpResource<ProjectSummary[]>(() => this.baseUrl());
  }

  getProjectRes(id: Signal<string | undefined>) {
    return httpResource<ProjectDetail>(() => id() ? `${this.baseUrl()}/${id()}` : undefined);
  }

  listProjects(): Observable<ProjectSummary[]> {
    return this.http.get<ProjectSummary[]>(this.baseUrl());
  }

  getProject(projectId: string): Observable<ProjectDetail> {
    return this.http.get<ProjectDetail>(`${this.baseUrl()}/${projectId}`);
  }

  createProject(payload: { name: string; description: string }): Observable<ProjectDetail> {
    return this.http.post<ProjectDetail>(this.baseUrl(), payload);
  }

  updateProject(projectId: string, payload: { name: string; description: string }): Observable<ProjectDetail> {
    return this.http.patch<ProjectDetail>(`${this.baseUrl()}/${projectId}`, payload);
  }

  upsertMembership(
    projectId: string,
    payload: { userId?: string; email?: string; accessLevel: ResourceAccessLevel },
  ): Observable<ProjectDetail> {
    return this.http.post<ProjectDetail>(`${this.baseUrl()}/${projectId}/members`, payload);
  }

  removeMembership(projectId: string, userId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl()}/${projectId}/members/${userId}`);
  }
}
