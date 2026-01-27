import {computed, inject, Injectable, Signal} from '@angular/core';
import {BackendConfigService} from './backend-config.service';
import {httpResource} from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PredictionsApiService {
  private readonly backendConfig = inject(BackendConfigService);
  private readonly baseUrl = computed(() => `${this.backendConfig.backendUrl()}/api/predictions`);

  getBppm(sequence: Signal<string | null>) {
    return httpResource<{ matrix: number[][] }>(() => sequence() ? `${this.baseUrl()}/bppm?sequence=${sequence()}` : undefined);
  }

  getContextProbabilities(sequence: Signal<string | null>) {
    return httpResource<ContextProbabilityResponse>(() =>
      sequence() ? `${this.baseUrl()}/context-probabilities?sequence=${sequence()}` : undefined
    );
  }
}

interface ContextProbabilityResponse {
  hairpin: number[];
  bulge: number[];
  internal: number[];
  multi: number[];
  dangling: number[];
  paired: number[];
}
