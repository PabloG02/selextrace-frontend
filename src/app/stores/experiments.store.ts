import {computed, inject, Injectable, signal} from '@angular/core';
import {forkJoin, Observable, tap} from 'rxjs';
import {ExperimentsApiService} from '../services/experiments-api.service';
import {CreateExperimentDto} from '../models/create-experiment-dto';
import {ExperimentReport} from '../models/experiment-report';
import {ExperimentSummary} from '../models/experiment-summary';
import {ExperimentStatus} from '../models/experiment';

// Filter and sort option types
export type DateRangeFilter = 'all' | '7' | '30' | '90';
export type SortOption = 'name' | 'createdAt';

@Injectable({ providedIn: 'root' })
export class ExperimentsStore {
  private readonly apiService = inject(ExperimentsApiService);
  private readonly experiments = this.apiService.getExperimentsRes();

  readonly globalSearchTerm = signal('');
  readonly statusFilter = signal<'all' | ExperimentStatus>('all');
  readonly dateRangeFilter = signal<DateRangeFilter>('all');
  readonly sortOption = signal<SortOption>('createdAt');

  readonly filteredExperiments = computed(() => {
    if (!this.experiments.hasValue()) return [];

    const list = this.experiments.value();

    const search = this.globalSearchTerm().toLocaleLowerCase();
    const status = this.statusFilter();
    const dateRange = this.dateRangeFilter();
    const sort = this.sortOption();

    // 1. Filter
    let result = list.filter((exp) => {
      const matchesSearch = !search
        || exp.name.toLocaleLowerCase().includes(search)
        || exp.description?.toLocaleLowerCase().includes(search) || false;
      const matchesStatus = status === 'all' || exp.status === status;
      const matchesDate = this.filterByDateRange(exp, dateRange);

      return matchesSearch && matchesStatus && matchesDate;
    });

    // 2. Sort
    result = this.applySort(result, sort);

    return result;
  });

  /**
   * Deletes a single experiment and refreshes the list.
   */
  deleteExperiment(id: string): void {
    this.apiService.deleteExperiment(id).subscribe({
      next: () => {
        this.experiments.reload();
      },
      error: (err) => {
        console.error('Failed to delete experiment', err);
      }
    });
  }

  /**
   * Deletes multiple experiments in parallel and refreshes the list once.
   */
  deleteExperiments(ids: string[]): void {
    if (ids.length === 0) return;

    const tasks$ = ids.map(id => this.apiService.deleteExperiment(id));
    forkJoin(tasks$).subscribe({
      next: () => {
        this.experiments.reload();
      },
      error: (err) => {
        console.error('Failed to delete some experiments', err);
        this.experiments.reload();
      }
    });
  }

  /**
   * Creates a new experiment with files via API call and updates the local store.
   * @param dto - The experiment creation payload
   * @param onProgress - Optional callback for upload progress
   * @returns Observable of the created experiment
   */
  createExperimentWithFiles(dto: CreateExperimentDto, onProgress?: (progress: number) => void): Observable<ExperimentReport> {
    return this.apiService.createExperimentWithFiles(dto, onProgress).pipe(
      tap((experiment) => {
        this.experiments.reload();
      })
    );
  }

  isNameAvailable(name: string, ignoreId?: string): boolean {
    return !this.experiments.value()?.some(
      (experiment) =>
        experiment.name.toLocaleLowerCase() === name.toLocaleLowerCase() && experiment.id !== ignoreId,
    );
  }

  /**
   * Filter experiments by date range
   * @param experiment - The experiment to check
   * @param range - The date range filter value
   * @returns Whether the experiment matches the date range
   */
  private filterByDateRange(experiment: ExperimentSummary, range: DateRangeFilter): boolean {
    if (range === 'all') return true;
    const days = Number(range);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return new Date(experiment.createdAt).getTime() >= cutoff;
  }

  /**
   * Sort experiments by the specified criteria
   * @param list - The experiments to sort
   * @param sortKey - The sort option to apply
   * @returns The sorted experiments array
   */
  private applySort(list: ExperimentSummary[], sortKey: SortOption): ExperimentSummary[] {
    const compareBy = {
      name: (a: ExperimentSummary, b: ExperimentSummary) => a.name.localeCompare(b.name),
      createdAt: (a: ExperimentSummary, b: ExperimentSummary) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    };

    return list.sort(compareBy[sortKey]);
  }
}
