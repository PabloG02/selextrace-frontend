import {computed, inject, Injectable, Signal} from '@angular/core';
import {HttpClient, httpResource} from '@angular/common/http';
import {Observable} from 'rxjs';
import {BackendConfigService} from './backend-config.service';
import {MotifAnalysis} from '../models/motif-analysis';
import {AptaTraceConfiguration} from '../models/aptatrace-configuration';

@Injectable({ providedIn: 'root' })
export class MotifsApiService {
  private readonly http = inject(HttpClient);
  private readonly backendConfig = inject(BackendConfigService);
  private readonly baseUrl = computed(() => `${this.backendConfig.backendUrl()}/api/experiments`);

  getAnalysesRes(experimentId: Signal<string | undefined>) {
    return httpResource<MotifAnalysis[]>(() =>
      experimentId() ? `${this.baseUrl()}/${experimentId()}/motifs` : undefined
    );
  }

  getAnalysisRes(experimentId: Signal<string | undefined>, analysisId: Signal<string | undefined>) {
    return httpResource<MotifAnalysis>(() =>
      experimentId() && analysisId() ? `${this.baseUrl()}/${experimentId()}/motifs/${analysisId()}` : undefined
    );
  }

  createAnalysis(experimentId: string, payload: AptaTraceConfiguration): Observable<MotifAnalysis> {
    return this.http.post<MotifAnalysis>(
      `${this.baseUrl()}/${experimentId}/motifs`,
      payload
    );
  }

  deleteAnalysis(experimentId: string, analysisId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl()}/${experimentId}/motifs/${analysisId}`
    );
  }
}