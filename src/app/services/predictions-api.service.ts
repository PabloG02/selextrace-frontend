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
}
