import {HttpClient, HttpEvent, HttpEventType, httpResource} from '@angular/common/http';
import {Injectable, inject, Signal, computed} from '@angular/core';
import {filter, Observable} from 'rxjs';
import {ExperimentReport} from '../models/experiment-report';
import {map} from 'rxjs/operators';
import {CreateExperimentDto} from '../models/create-experiment-dto';
import {BackendConfigService} from './backend-config.service';
import {ExperimentSummary} from '../models/experiment-summary';

@Injectable({ providedIn: 'root' })
export class ExperimentsApiService {
  private readonly http = inject(HttpClient);
  private readonly backendConfig = inject(BackendConfigService);
  private readonly baseUrl = computed(() => `${this.backendConfig.backendUrl()}/api/experiments`);

  getExperimentsRes() {
    return httpResource<ExperimentSummary[]>(() => this.baseUrl());
  }

  getExperimentReportRes(id: Signal<string | undefined>) {
    return httpResource<ExperimentReport>(() => id() ? `${this.baseUrl()}/${id()}` : undefined);
  }

  deleteExperiment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl()}/${id}`);
  }

  /**
   * Creates an experiment with all files in a single multipart request.
   *
   * @param dto - The experiment metadata
   * @param onProgress - Optional callback for upload progress
   * @returns Observable of the created experiment
   */
  createExperimentWithFiles(
    dto: CreateExperimentDto,
    onProgress?: (progress: number) => void
  ): Observable<ExperimentReport> {
    const formData = new FormData();

    // Add the main DTO (without the actual File objects)
    formData.append('data', new Blob([JSON.stringify({
      ...dto,
      selectionCycles: dto.selectionCycles.map(cycle => ({
        ...cycle,
        files: undefined, // exclude files, they go separately
      })),
    })], { type: 'application/json' }));

    // Append forward & reverse files separately
    dto.selectionCycles.forEach(cycle => {
      const key = cycle.roundName;
      formData.append(`forwardFiles[${key}]`, cycle.files.forward);
      if (cycle.files.reverse) {
        formData.append(`reverseFiles[${key}]`, cycle.files.reverse);
      }
    });

    return this.http.post<ExperimentReport>(this.baseUrl(), formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      map((event: HttpEvent<ExperimentReport>) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          const progress = Math.round((100 * event.loaded) / event.total);
          onProgress?.(progress);
        }
        return event;
      }),
      filter((event): event is HttpEvent<ExperimentReport> & { body: ExperimentReport } =>
        event.type === HttpEventType.Response && event.body !== null
      ),
      map(event => event.body)
    );
  }
}
