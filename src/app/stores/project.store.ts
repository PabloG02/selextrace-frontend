import { computed, inject, Injectable } from '@angular/core';
import {ProjectsApiService} from '../services/projects-api.service';

@Injectable({ providedIn: 'root' })
export class ProjectStore {
  private readonly projectsApi = inject(ProjectsApiService);

  private readonly projectsRes = this.projectsApi.getProjectsRes();

  readonly projects = computed(() => this.projectsRes.value());
  readonly isLoading = this.projectsRes.isLoading;
  readonly error = this.projectsRes.error;

  reloadProjects(): void {
    this.projectsRes.reload();
  }
}
