import {ChangeDetectionStrategy, Component, effect, inject, input, signal} from '@angular/core';
import {Router} from '@angular/router';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatChipsModule} from '@angular/material/chips';
import {MatTabsModule} from '@angular/material/tabs';
import {MatListModule} from '@angular/material/list';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatSnackBar, MatSnackBarModule} from '@angular/material/snack-bar';
import {take} from 'rxjs';
import {ExperimentsStore} from '../../stores/experiments.store';
import {ConfirmDialogComponent} from '../shared/confirm-dialog/confirm-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {ExperimentsApiService} from '../../services/experiments-api.service';
import {AptamerPoolTabComponent} from '../aptamer-pool-tab/aptamer-pool-tab.component';
import {FormsModule} from '@angular/forms';
import {SequencingDataTab} from '../sequencing-data-tab/sequencing-data-tab';
import {ExperimentOverviewTab} from '../experiment-overview-tab/experiment-overview-tab';
import {AptamerFamilyAnalysisTab} from '../aptamer-family-analysis-tab/aptamer-family-analysis-tab.component';
import {MotifAnalysisTabComponent} from '../motif-analysis-tab/motif-analysis-tab.component';
import {ExperimentCreationParams, SelectionCycleImport} from '../../models/experiment-creation-params';
import {DownloadService} from '../../services/download.service';

@Component({
  selector: 'app-experiment-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatProgressSpinnerModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatListModule,
    MatTooltipModule,
    MatSnackBarModule,
    AptamerPoolTabComponent,
    FormsModule,
    SequencingDataTab,
    ExperimentOverviewTab,
    AptamerFamilyAnalysisTab,
    MotifAnalysisTabComponent,
  ],
  templateUrl: "./experiment-detail.component.html",
  styleUrl: "./experiment-detail.component.scss",
})
export class ExperimentDetailComponent {
  private readonly experimentsStore = inject(ExperimentsStore);
  protected readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly apiService = inject(ExperimentsApiService);
  private readonly downloadService = inject(DownloadService);

  readonly activeTab = signal(0);
  readonly isLoading = signal(false);

  readonly experimentId = input.required<string>();
  readonly experimentReportRes = this.apiService.getExperimentReportRes(this.experimentId);
  readonly experimentReport = this.experimentReportRes.value;

  constructor() {
    effect(
      () => {
        document.title = `${this.experimentReport()?.name} • SELEXTrace`;
      }
    );
  }

  randomizedRegionDescription(): string {
    // const experiment = this.experiment();
    // if (!experiment) {
    //   return 'Unknown';
    // }
    // const region = experiment.sequencing.randomizedRegion;
    // return region.type === 'exact'
    //   ? `${region.exactLength} bases`
    //   : `${region.min} - ${region.max} bases`;
    return 'TODO';
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
    if (!experiment) {
      return;
    }
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete experiment?',
          message: `Deleting "${experiment.name}" cannot be undone.`,
          confirmLabel: 'Delete',
          variant: 'warning',
        },
        autoFocus: false
      })
      .afterClosed()
      .pipe(take(1))
      .subscribe((confirmed) => {
        if (confirmed) {
          this.experimentsStore.deleteExperiment(this.experimentId());
          this.snackBar.open('Experiment deleted', 'Dismiss', { duration: 2500 });
          this.router.navigate(['/experiments']);
        }
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
      sequencing: {
        isDemultiplexed: true,  // TODO
        readType: 'paired-end', // TODO
        fileFormat: 'fastq',    // TODO
        primers: {
          fivePrime: report.sequencing.fivePrimePrimer,
          threePrime: report.sequencing.threePrimePrimer || undefined,
        },
        // TODO: Do not assume the same region type for all experiments
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
      } satisfies SelectionCycleImport))
    };

    const blob = new Blob([JSON.stringify(params, null, 2)], { type: 'application/json' });
    this.downloadService.downloadBlob(blob, `${this.slugify(report.name)}-creation-params.json`);

    this.snackBar.open('Experiment params exported.', 'Dismiss', { duration: 2500 });
  }

  private slugify(value: string): string {
    const trimmed = value.trim().toLocaleLowerCase();
    const slug = trimmed.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return slug || 'experiment';
  }

  protected readonly Object = Object;
}
