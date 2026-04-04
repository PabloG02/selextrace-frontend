import { computed, inject, Injectable, Signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BackendConfigService } from './backend-config.service';
import { FsbcAnalysis } from '../models/fsbc-analysis';
import { FsbcConfiguration } from '../models/fsbc-configuration';

@Injectable({ providedIn: 'root' })
export class FsbcApiService {
  private readonly http = inject(HttpClient);
  private readonly backendConfig = inject(BackendConfigService);
  private readonly baseUrl = computed(() => `${this.backendConfig.backendUrl()}/api/experiments`);

  getAnalysesRes(experimentId: Signal<string | undefined>) {
    return httpResource<FsbcAnalysis[]>(() =>
      experimentId() ? `${this.baseUrl()}/${experimentId()}/fsbc` : undefined
    );
  }

  getAnalysisRes(experimentId: Signal<string | undefined>, analysisId: Signal<string | undefined>) {
    return httpResource<FsbcAnalysis>(() =>
      experimentId() && analysisId() ? `${this.baseUrl()}/${experimentId()}/fsbc/${analysisId()}` : undefined
    );
  }

  createAnalysis(experimentId: string, payload: FsbcConfiguration): Observable<FsbcAnalysis> {
    return this.http.post<FsbcAnalysis>(`${this.baseUrl()}/${experimentId}/fsbc`, payload);
  }

  deleteAnalysis(experimentId: string, analysisId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl()}/${experimentId}/fsbc/${analysisId}`);
  }
}
