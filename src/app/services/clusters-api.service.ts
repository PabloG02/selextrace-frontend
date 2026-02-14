import {computed, inject, Injectable, Signal} from '@angular/core';
import {HttpClient, httpResource} from '@angular/common/http';
import {BackendConfigService} from './backend-config.service';
import {ClusterAnalysis} from '../models/cluster-analysis';
import {AptaClusterConfiguration} from '../models/aptacluster-configuration';
import {Observable} from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClustersApiService {
  private readonly http = inject(HttpClient);
  private readonly backendConfig = inject(BackendConfigService);
  private readonly baseUrl = computed(() => `${this.backendConfig.backendUrl()}/api/experiments`);

  getAnalysesRes(experimentId: Signal<string | undefined>) {
    return httpResource<ClusterAnalysis[]>(() =>
      experimentId() ? `${this.baseUrl()}/${experimentId()}/clusters` : undefined
    );
  }

  getAnalysisRes(experimentId: Signal<string | undefined>, analysisId: Signal<string | undefined>) {
    return httpResource<ClusterAnalysis>(() =>
      experimentId() && analysisId() ? `${this.baseUrl()}/${experimentId()}/clusters/${analysisId()}` : undefined
    );
  }

  createAnalysis(experimentId: string, payload: AptaClusterConfiguration): Observable<ClusterAnalysis> {
    return this.http.post<ClusterAnalysis>(
      `${this.baseUrl()}/${experimentId}/clusters`,
      payload
    );
  }
}
