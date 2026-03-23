import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  TemplateRef,
  viewChild
} from '@angular/core';
import {CommonModule} from '@angular/common';
import {finalize} from 'rxjs';
import {form, FormField, min, required} from '@angular/forms/signals';
import {MatButtonModule} from '@angular/material/button';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner';
import {MatSelectModule} from '@angular/material/select';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {MatRippleModule} from '@angular/material/core';
import {NgxEchartsDirective} from 'ngx-echarts';
import {ExperimentReport, SelectionCycleResponse} from '../../models/experiment-report';
import {AptaTraceConfiguration} from '../../models/aptatrace-configuration';
import {MotifAnalysis, MotifAnalysisProfile} from '../../models/motif-analysis';
import {ExperimentChartService} from '../../services/experiment-chart.service';
import {MotifsApiService} from '../../services/motifs-api.service';
import {ThemeService} from '../../services/theme.service';
import {AptamerTableComponent, AptamerTableRow, SelectionCycleMetrics} from '../shared/aptamer-table/aptamer-table.component';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle
} from '@angular/material/expansion';
import {Listbox, Option} from '@angular/aria/listbox';
import {MatDialog, MatDialogModule} from '@angular/material/dialog';
import {ChartDialogTriggerComponent} from '../shared/chart-dialog-trigger/chart-dialog-trigger.component';

type RankedMotifProfile = {
  rank: number;
  profile: MotifAnalysisProfile;
};

@Component({
  selector: 'app-motif-analysis-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRippleModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggle,
    NgxEchartsDirective,
    FormField,
    AptamerTableComponent,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    Listbox,
    Option,
    MatDialogModule,
    ChartDialogTriggerComponent,
  ],
  templateUrl: './motif-analysis-tab.component.html',
  styleUrl: './motif-analysis-tab.component.scss',
})
export class MotifAnalysisTabComponent {
  readonly themeService = inject(ThemeService);
  private readonly motifsApi = inject(MotifsApiService);
  private readonly chartService = inject(ExperimentChartService);
  private readonly dialog = inject(MatDialog);

  /* Inputs */
  readonly experimentId = input.required<string>();
  readonly experimentReport = input.required<ExperimentReport>();
  /* View Queries */
  readonly motifDialog = viewChild.required<TemplateRef<void>>('motifDialog');

  /* Resources */
  /** Resource containing all motif analyses for the current experiment */
  readonly analysesRes = this.motifsApi.getAnalysesRes(this.experimentId);

  /* Form State (AptaTrace Params) */
  readonly motifFormModel = signal({
    kmerLength: 6,
    alpha: 10,
    filterClusters: true,
  });
  readonly motifForm = form(this.motifFormModel, (path) => {
    required(path.kmerLength);
    min(path.kmerLength, 2);
    required(path.alpha);
    min(path.alpha, 1);
    required(path.filterClusters);
  });

  /* Reactive Signal Form Model */
  readonly sequenceTableFormModel = signal({
    showPrimers: false,
    useCPM: true,
  });
  readonly sequenceTableForm = form(this.sequenceTableFormModel);

  readonly motifCoverageFormModel = signal({
    cycleRound: 0,
    useCpm: true,
  });
  readonly motifCoverageForm = form(this.motifCoverageFormModel);

  /** Tracks whether the motif analysis is running */
  readonly isSubmitting = signal(false);
  /** Tracks which analysis is being deleted */
  readonly deletingAnalysisId = signal<string | null>(null);

  /* Form: Select options */
  readonly maxRandomizedRegionSize = computed(() => {
    const accepted = this.experimentReport()?.technicalDetails.metadata.nucleotideDistributionAccepted;
    if (!accepted) return 0;

    return Math.max(
      ...Object.values(accepted).flatMap(sizeMap => Object.keys(sizeMap).map(Number))
    );
  });
  /** K-mer size (2 to maxRandomizedRegionSize - 1) */
  readonly kmerSizeOptions = computed(() => {
    const maxRegionSize = this.maxRandomizedRegionSize();
    if (maxRegionSize <= 2) {
      return [] as number[];
    }

    return Array.from({length: maxRegionSize - 2}, (_, index) => index + 2);
  });

  /* Analysis Selection Logic */
  /** All available analyses sorted by creation date (newest first) */
  readonly sortedAnalyses = computed<MotifAnalysis[]>(() => {
    const analyses = this.analysesRes.value() ?? [];
    return [...analyses].sort((left, right) =>
      new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
    );
  });

  /** User-selected analysis ID */
  readonly selectedAnalysisId = signal<string | null>(null);

  /**
   * Currently active analysis for display.
   * Returns user selection if present, otherwise defaults to the newest analysis.
   */
  readonly activeAnalysis = computed<MotifAnalysis | null>(() => {
    const list = this.sortedAnalyses();
    if (list.length === 0) return null;

    const selectedId = this.selectedAnalysisId();
    if (selectedId) {
      const found = list.find(a => a.id === selectedId);
      if (found) return found;
    }

    // Default to the newest one
    return list[0];
  });

  readonly rankedProfiles = computed<RankedMotifProfile[]>(() => {
    const profiles = this.activeAnalysis()?.profiles ?? [];
    return profiles.map((profile, index) => ({
      rank: index + 1,
      profile,
    }));
  });

  readonly selectedMotifRank = signal<number | null>(null);

  readonly activeMotif = computed<RankedMotifProfile | null>(() => {
    const profiles = this.rankedProfiles();
    if (profiles.length === 0) {
      return null;
    }

    const selectedRank = this.selectedMotifRank();
    if (selectedRank !== null) {
      const selectedMotif = profiles.find((motif) => motif.rank === selectedRank);
      if (selectedMotif) {
        return selectedMotif;
      }
    }

    return profiles[0];
  });

  readonly activeMotifProfile = computed<MotifAnalysisProfile | null>(() => this.activeMotif()?.profile ?? null);

  readonly activeRoundLabels = computed(() => {
    const roundNames = this.activeAnalysis()?.roundNames ?? [];
    if (roundNames.length > 0) {
      return roundNames;
    }

    return this.experimentReport().selectionCycles
      .filter((cycle) => !cycle.isControlSelection && !cycle.isCounterSelection)
      .sort((left, right) => left.round - right.round)
      .map((cycle) => cycle.name);
  });

  /* Aptamer Table Data */
  /** All aptamers from the experiment formatted as table rows. */
  private readonly allAptamerRows = computed<AptamerTableRow[]>(() => {
    const { idToAptamer, idToBounds } = this.experimentReport().pool;
    const { selectionCycles } = this.experimentReport();
    const sortedCycles = [...selectionCycles].sort((a, b) => a.round - b.round);

    return Object.entries(idToAptamer).map(([id, sequence]) => {
      const aptamerId = Number(id);
      const cycles: Record<number, SelectionCycleMetrics> = {};

      let previousFrequency = 0;

      for (const cycle of sortedCycles) {
        const count = cycle.counts[aptamerId] ?? 0;
        const frequency = count / cycle.totalSize;
        const cpm = frequency * 1_000_000;

        const enrichment = previousFrequency > 0 ? frequency / previousFrequency : null;

        cycles[cycle.round] = { count, cpm, frequency, enrichment };

        previousFrequency = frequency;
      }

      return {
        id: aptamerId,
        sequence,
        bounds: idToBounds[aptamerId],
        cycles,
      };
    });
  });

  /** Aptamer rows filtered to only those that are members of the active motif */
  readonly aptamersForActiveMotif = computed(() => {
    const motif = this.activeMotif();
    if (!motif) return [] as AptamerTableRow[];

    const aptamerIds = new Set(motif.profile.memberAptamers.map((member) => member.aptamerId));
    return this.allAptamerRows().filter((row) => aptamerIds.has(row.id));
  });

  readonly activeMotifSearchTerms = computed(() => {
    const motif = this.activeMotif();
    if (!motif) return [];

    return [...new Set([
      motif.profile.seed,
      motif.profile.consensus,
      ...motif.profile.kmers,
    ].map((term) => term.trim().toUpperCase()).filter(Boolean))];
  });

  readonly activeMotifKmerAlignmentEntries = computed(() => {
    const motif = this.activeMotif();
    if (!motif) return [];

    return Object.entries(motif.profile.kmerAlignment).map(([kmer, alignment]) => ({kmer, alignment}));
  });

  /* Charts */
  /** Selected aptamers for charting */
  readonly selectedAptamerRows = signal<AptamerTableRow[]>([]);
  readonly motifCoverageCycles = computed<SelectionCycleResponse[]>(() =>
    [...this.experimentReport().selectionCycles].sort((left, right) => left.round - right.round)
  );
  readonly activeMotifCoverageCycle = computed<SelectionCycleResponse | null>(() => {
    const cycles = this.motifCoverageCycles();
    if (cycles.length === 0) return null;

    const selectedRound = this.motifCoverageForm.cycleRound().value();
    return cycles.find((cycle) => cycle.round === selectedRound) ?? cycles.at(-1) ?? null;
  });
  readonly selectedAptamerCardinalityMetric = signal<'counts' | 'enrichments'>('counts');

  readonly motifSequenceLogoChartOptions = this.chartService.getMotifSequenceLogoChart(this.activeMotifProfile);

  readonly motifContextTraceChartOptions = this.chartService.getMotifContextTraceChart(
    this.activeMotifProfile,
    this.activeRoundLabels
  );

  readonly motifCoverageChartOptions = this.chartService.getMotifCoverageChart(
    this.experimentReport,
    this.activeMotifProfile,
    this.activeMotifCoverageCycle,
    this.motifCoverageForm.useCpm().value
  );

  readonly selectedAptamerCardinalityChartOptions = this.chartService.getSelectedAptamerCardinalityChart(
    this.experimentReport,
    this.selectedAptamerRows,
    this.sequenceTableForm.useCPM().value,
    this.selectedAptamerCardinalityMetric
  );

  constructor() {
    effect(() => {
      const motifs = this.rankedProfiles();
      if (motifs.length === 0) {
        this.selectedMotifRank.set(null);
        this.selectedAptamerRows.set([]);
        return;
      }

      const selectedRank = this.selectedMotifRank();
      if (selectedRank === null || !motifs.some((motif) => motif.rank === selectedRank)) {
        this.selectedMotifRank.set(motifs[0].rank);
      }
    });

    effect(() => {
      const cycles = this.motifCoverageCycles();
      if (cycles.length === 0) {
        return;
      }

      const selectedRound = this.motifCoverageForm.cycleRound().value();
      if (!cycles.some((cycle) => cycle.round === selectedRound)) {
        this.motifCoverageForm.cycleRound().value.set(cycles.at(-1)!.round);
      }
    });
  }

  /**
   * Selects a specific analysis for viewing.
   * Resets motif selection when switching analyses.
   */
  selectAnalysis(analysisId: string) {
    this.selectedAnalysisId.set(analysisId);
    this.selectedMotifRank.set(null);
    this.selectedAptamerRows.set([]);
  }

  /** Selects a specific motif for viewing within the active analysis. */
  selectMotif(rank: number) {
    this.selectedMotifRank.set(rank);
    this.selectedAptamerRows.set([]);
  }

  /**
   * Summits motif analysis job with current form parameters.
   * Reloads analysis list upon completion.
   */
  runMotifAnalysis() {
    const experimentId = this.experimentId();
    if (!experimentId || this.isSubmitting() || this.motifForm().invalid()) {
      return;
    }

    const payload: AptaTraceConfiguration = {
      kmerLength: this.motifForm.kmerLength().value(),
      alpha: this.motifForm.alpha().value(),
      filterClusters: this.motifForm.filterClusters().value(),
    };

    this.isSubmitting.set(true);
    this.motifsApi.createAnalysis(experimentId, payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.selectedAnalysisId.set(null);
          this.selectedMotifRank.set(null);
          this.selectedAptamerRows.set([]);
          this.analysesRes.reload();
        },
        error: (error) => {
          console.error('Failed to run AptaTRACE', error);
        }
      });
  }

  deleteAnalysis(analysisId: string): void {
    const experimentId = this.experimentId();
    if (!experimentId || !analysisId || this.deletingAnalysisId()) {
      return;
    }

    this.deletingAnalysisId.set(analysisId);
    this.motifsApi.deleteAnalysis(experimentId, analysisId)
      .pipe(finalize(() => this.deletingAnalysisId.set(null)))
      .subscribe({
        next: () => {
          if (this.selectedAnalysisId() === analysisId) {
            this.selectedAnalysisId.set(null);
            this.selectedMotifRank.set(null);
            this.selectedAptamerRows.set([]);
          }
          this.analysesRes.reload();
        },
        error: (error) => {
          console.error('Failed to delete motif analysis', error);
        }
      });
  }

  openAptaTraceDialog(): void {
    this.dialog.open(this.motifDialog(), {
      autoFocus: false
    });
  }

  formatAnalysisMeta(analysis: MotifAnalysis) {
    const clusterScope = analysis.requestConfig.filterClusters ? 'Filtered clusters' : 'All clusters';
    return `${clusterScope} • ${analysis.motifCount} motifs • ${analysis.significantKmerCount} significant k-mers`;
  }
}
