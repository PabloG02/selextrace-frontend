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
import {ConfirmDialogComponent} from '../shared/confirm-dialog.component';
import {MatDialog} from '@angular/material/dialog';
import {ExperimentsApiService} from '../../services/experiments-api.service';
import {AptamerPoolTabComponent} from '../aptamer-pool-tab/aptamer-pool-tab.component';
import {FormsModule} from '@angular/forms';
import {SequencingDataTab} from '../sequencing-data-tab/sequencing-data-tab';
import {ExperimentOverviewTab} from '../experiment-overview-tab/experiment-overview-tab';

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

  readonly activeTab = signal(0);
  readonly isLoading = signal(false);

  readonly experimentId = input.required<string>();
  readonly experimentReportRes = this.apiService.getExperimentReportRes(this.experimentId);
  readonly experimentReport = this.experimentReportRes.value;

  constructor() {
    effect(
      () => {
        document.title = `${this.experimentReport()?.experimentDetails.generalInformation.name} • Aptasuite`;
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
          message: `Deleting "${experiment.experimentDetails.generalInformation.name}" cannot be undone.`,
          confirmLabel: 'Delete',
          confirmColor: 'warn',
          icon: 'delete_forever',
        },
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

  protected readonly Object = Object;
}
