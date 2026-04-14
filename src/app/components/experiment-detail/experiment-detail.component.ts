import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { exhaustMap, filter, finalize } from 'rxjs';
import { ExperimentsStore } from '../../stores/experiments.store';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { ExperimentsApiService } from '../../services/experiments-api.service';
import { ProjectsApiService } from '../../services/projects-api.service';
import { AptamerPoolTabComponent } from '../aptamer-pool-tab/aptamer-pool-tab.component';
import { FormsModule } from '@angular/forms';
import { SequencingDataTab } from '../sequencing-data-tab/sequencing-data-tab';
import { ExperimentOverviewTab } from '../experiment-overview-tab/experiment-overview-tab';
import { AptamerFamilyAnalysisTab } from '../aptamer-family-analysis-tab/aptamer-family-analysis-tab.component';
import { FsbcAnalysisTabComponent } from '../fsbc-analysis-tab/fsbc-analysis-tab.component';
import { MotifAnalysisTabComponent } from '../motif-analysis-tab/motif-analysis-tab.component';
import { ExperimentCreationParams, SelectionCycleImport } from '../../models/experiment-creation-params';
import { DownloadService } from '../../services/download.service';
import { ResourceAccessLevel } from '../../models/auth';
import { ExperimentAccessGrant, ProjectSummary } from '../../models/project';

@Component({
  selector: 'app-experiment-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    MatSnackBarModule,
    AptamerPoolTabComponent,
    FormsModule,
    SequencingDataTab,
    ExperimentOverviewTab,
    AptamerFamilyAnalysisTab,
    FsbcAnalysisTabComponent,
    MotifAnalysisTabComponent,
  ],
  templateUrl: './experiment-detail.component.html',
  styleUrl: './experiment-detail.component.scss',
})
export class ExperimentDetailComponent {
  private readonly experimentsStore = inject(ExperimentsStore);
  protected readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly apiService = inject(ExperimentsApiService);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly downloadService = inject(DownloadService);

  readonly activeTab = signal(0);
  readonly experimentAccess = signal<ExperimentAccessGrant[]>([]);
  readonly shareEmail = signal('');
  readonly shareAccessLevel = signal<ResourceAccessLevel>('VIEWER');
  readonly accessLevels: ResourceAccessLevel[] = ['VIEWER', 'MANAGER'];
  readonly availableProjects = signal<ProjectSummary[]>([]);
  readonly destinationProjectId = signal('');
  readonly isMovingProject = signal(false);

  readonly experimentId = input.required<string>();
  readonly experimentReportRes = this.apiService.getExperimentReportRes(this.experimentId);
  readonly experimentReport = this.experimentReportRes.value;

  constructor() {
    this.loadProjects();

    effect(() => {
      const name = this.experimentReport()?.name;
      document.title = name ? `${name} • SELEXTrace` : 'Experiment Details • SELEXTrace';
    });

    effect(() => {
      const report = this.experimentReport();
      if (report?.permissions.canShare) {
        this.loadAccess();
      }

      if (report?.project?.id) {
        this.destinationProjectId.set(report.project.id);
      }
    });
  }

  projectOptionLabel(project: ProjectSummary): string {
    return project.personalProject ? `${project.name} (Personal workspace)` : project.name;
  }

  avatarInitials(owner: string): string {
    return owner
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  deleteExperiment(): void {
    const experiment = this.experimentReport();
    if (!experiment || !experiment.permissions.canDelete) return;

    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete experiment?',
          message: `Deleting "${experiment.name}" cannot be undone.`,
          confirmLabel: 'Delete',
          variant: 'warning',
        },
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        filter(Boolean),
        exhaustMap(() => this.experimentsStore.deleteExperiment(this.experimentId())),
      )
      .subscribe({
        next: () => {
          this.snackBar.open('Experiment deleted', 'Dismiss', { duration: 2500 });
          this.router.navigate(['/experiments']);
        },
        error: () => {
          this.snackBar.open('Failed to delete experiment', 'Dismiss', { duration: 3000 });
        },
      });
  }

  exportCreationParams(): void {
    const report = this.experimentReport();
    if (!report) {
      this.snackBar.open('Experiment report is still loading.', 'Dismiss', { duration: 2500 });
      return;
    }

    const params: Partial<ExperimentCreationParams> = {
      name: report.name,
      description: report.description,
      projectId: report.project?.id ?? undefined,
      sequencing: {
        isDemultiplexed: true,
        readType: 'paired-end',
        fileFormat: 'fastq',
        primers: {
          fivePrime: report.sequencing.fivePrimePrimer,
          threePrime: report.sequencing.threePrimePrimer || undefined,
        },
        randomizedRegion: {
          type: 'exact',
          exactLength: report.sequencing.aptamerSize,
        },
      },
      selectionCycles: report.selectionCycles.map((cycle) => ({
        roundNumber: cycle.round,
        roundName: cycle.name,
        isControl: cycle.isControlSelection,
        isCounterSelection: cycle.isCounterSelection,
      } satisfies SelectionCycleImport)),
    };

    const blob = new Blob([JSON.stringify(params, null, 2)], { type: 'application/json' });
    this.downloadService.downloadBlob(blob, `${this.slugify(report.name)}-creation-params.json`);

    this.snackBar.open('Experiment params exported.', 'Dismiss', { duration: 2500 });
  }

  loadAccess(): void {
    this.apiService.listExperimentAccess(this.experimentId()).subscribe({
      next: (grants) => this.experimentAccess.set(grants),
      error: () => {
        this.snackBar.open('Unable to load experiment access.', 'Dismiss', { duration: 3000 });
      },
    });
  }

  shareExperiment(): void {
    const email = this.shareEmail().trim();
    if (!email) {
      this.snackBar.open('Enter a user email to share this experiment.', 'Dismiss', { duration: 3000 });
      return;
    }

    this.apiService.upsertExperimentAccess(this.experimentId(), {
      email,
      accessLevel: this.shareAccessLevel(),
    }).subscribe({
      next: (grants) => {
        this.experimentAccess.set(grants);
        this.shareEmail.set('');
        this.shareAccessLevel.set('VIEWER');
      },
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to update experiment access.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }

  removeAccess(userId: string): void {
    this.apiService.removeExperimentAccess(this.experimentId(), userId).subscribe({
      next: () => this.loadAccess(),
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to remove experiment access.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }

  moveExperimentToProject(): void {
    const report = this.experimentReport();
    if (!report || !report.permissions.canManage) {
      return;
    }

    const targetProjectId = this.destinationProjectId().trim();
    if (!targetProjectId) {
      this.snackBar.open('Choose a destination project first.', 'Dismiss', { duration: 3000 });
      return;
    }

    if (targetProjectId === report.project?.id) {
      return;
    }

    this.isMovingProject.set(true);
    this.apiService.transferExperimentToProject(this.experimentId(), targetProjectId)
      .pipe(finalize(() => this.isMovingProject.set(false)))
      .subscribe({
        next: () => {
          this.experimentReportRes.reload();
          this.snackBar.open('Experiment moved successfully.', 'Dismiss', { duration: 2500 });
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Unable to move experiment to the selected project.';
          this.snackBar.open(message, 'Dismiss', { duration: 3500 });
        },
      });
  }

  private loadProjects(): void {
    this.projectsApi.listProjects().subscribe({
      next: (projects) => {
        this.availableProjects.set(projects);
        if (!this.destinationProjectId()) {
          const currentProjectId = this.experimentReport()?.project?.id;
          if (currentProjectId) {
            this.destinationProjectId.set(currentProjectId);
          }
        }
      },
      error: () => {
        this.snackBar.open('Unable to load projects for transfer.', 'Dismiss', { duration: 3500 });
      },
    });
  }

  private slugify(value: string): string {
    const trimmed = value.trim().toLocaleLowerCase();
    const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || 'experiment';
  }
}
