import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe, NgOptimizedImage, TitleCasePipe } from '@angular/common';
import { take } from 'rxjs';
import {DateRangeFilter, ExperimentsStore, SortOption} from '../../stores/experiments.store';
import { ExperimentStatus } from '../../models/experiment';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import {ExperimentSummary} from '../../models/experiment-summary';

@Component({
  selector: 'app-experiments-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatCheckboxModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    DatePipe,
    TitleCasePipe,
    NgOptimizedImage,
  ],
  templateUrl: './experiments-list.component.html',
  styleUrl: './experiments-list.component.scss',
})
/**
 * Component that displays a filterable, sortable list of experiments.
 * Supports selection, deletion, and navigation to experiment details.
 */
export class ExperimentsListComponent {
  private readonly experimentsStore = inject(ExperimentsStore);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** Available experiment status filter options */
  readonly statusOptions: ExperimentStatus[] = ['draft', 'running', 'completed', 'error'];

  /** Available date range filter options */
  readonly dateRangeOptions: { value: DateRangeFilter; label: string }[] = [
    { value: 'all', label: 'Any time' },
    { value: '7', label: 'Last 7 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
  ];

  /** Available sort options for the experiment list */
  readonly sortOptions: { value: SortOption; label: string }[] = [
    { value: 'createdAt', label: 'Creation date' },
    { value: 'name', label: 'Name' },
  ];

  /** Set of currently selected experiment IDs */
  readonly selectedIds = signal<Set<string>>(new Set());

  /** Filtered and sorted experiments based on current filters and search term */
  readonly filteredExperiments = this.experimentsStore.filteredExperiments;

  readonly searchTerm = this.experimentsStore.globalSearchTerm;
  readonly statusFilter = this.experimentsStore.statusFilter;
  readonly dateRangeFilter = this.experimentsStore.dateRangeFilter;
  readonly sortOption = this.experimentsStore.sortOption;

  /** Whether any experiments are currently selected */
  readonly hasSelection = computed(() => this.selectedIds().size > 0);

  /** Navigate to the new experiment creation page */
  goToCreate(): void {
    this.router.navigate(['/experiments', 'new']);
  }

  /**
   * Toggle experiment selection with Ctrl/Cmd+click support
   * @param event - The mouse event
   * @param id - The experiment ID to toggle
   */
  toggleSelection(event: MouseEvent, id: string): void {
    if (event.ctrlKey || event.metaKey) {
      const updated = new Set(this.selectedIds());
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      this.selectedIds.set(updated);
    }
  }

  /** Select all filtered experiments */
  selectAll(): void {
    this.selectedIds.set(new Set(this.filteredExperiments().map((experiment) => experiment.id)));
  }

  /** Clear all selected experiments */
  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  /** Delete all selected experiments after confirmation */
  deleteSelected(): void {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) {
      return;
    }
    this.confirmDeletion(ids.length === 1 ? 'Delete experiment?' : `Delete ${ids.length} experiments?`,
      'Deleted experiments cannot be recovered.',
      () => {
        this.experimentsStore.deleteExperiments(ids);
        this.selectedIds.set(new Set());
        this.snackBar.open('Experiments deleted', 'Dismiss', { duration: 3000 });
      });
  }

  /**
   * Navigate to the experiment detail page
   * @param id - The experiment ID to open
   */
  openExperiment(id: string): void {
    this.router.navigate(['/experiments', id]);
  }

  /**
   * Delete a single experiment after confirmation
   * @param experiment - The experiment to delete
   */
  deleteExperiment(experiment: ExperimentSummary): void {
    this.confirmDeletion(
      'Delete experiment?',
      `This will permanently delete "${experiment.name}"`,
      () => {
        this.experimentsStore.deleteExperiment(experiment.id);
        const updated = new Set(this.selectedIds());
        updated.delete(experiment.id);
        this.selectedIds.set(updated);
        this.snackBar.open('Experiment deleted', 'Dismiss', { duration: 3000 });
      },
    );
  }

  /**
   * Generate avatar initials from a name
   * @param name - The name to generate initials from
   * @returns The first two initials in uppercase
   */
  avatarInitials(name: string): string {
    const parts = name.split(' ');
    return parts
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  /**
   * Show a confirmation dialog before deleting
   * @param title - The dialog title
   * @param message - The dialog message
   * @param onConfirm - Callback to execute when confirmed
   */
  private confirmDeletion(title: string, message: string, onConfirm: () => void): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title,
          message,
          confirmLabel: 'Delete',
          variant: 'warning',
        },
        autoFocus: false
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          onConfirm();
        }
      });
  }
}
