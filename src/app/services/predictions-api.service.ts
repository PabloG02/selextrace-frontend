import {computed, inject, Injectable, Signal} from '@angular/core';
import {BackendConfigService} from './backend-config.service';
import {httpResource} from '@angular/common/http';
import {ContextProbabilityResponse} from '../models/context-probability-response';
import {MfeResponse} from '../models/mfe-response';

@Injectable({ providedIn: 'root' })
export class PredictionsApiService {
  private readonly backendConfig = inject(BackendConfigService);
  private readonly baseUrl = computed(() => `${this.backendConfig.backendUrl()}/api/predictions`);

  getMfe(sequence: Signal<string | null>) {
    return httpResource<MfeResponse>(() =>
      sequence() ? `${this.baseUrl()}/mfe?sequence=${sequence()}` : undefined
    );
  }

  getBppm(sequence: Signal<string | null>) {
    return httpResource<{ matrix: number[][] }>(() =>
      sequence() ? `${this.baseUrl()}/bppm?sequence=${sequence()}` : undefined
    );
  }

  getContextProbabilities(sequence: Signal<string | null>) {
    return httpResource<ContextProbabilityResponse>(() =>
      sequence() ? `${this.baseUrl()}/context-probabilities?sequence=${sequence()}` : undefined
    );
  }
}
