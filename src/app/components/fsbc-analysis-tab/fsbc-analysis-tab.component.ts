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
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { form, FormField, min, required } from '@angular/forms/signals';
import { FormsModule } from '@angular/forms';
import { Listbox, Option } from '@angular/aria/listbox';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle
} from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRippleModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { NgxEchartsDirective } from 'ngx-echarts';
import { AptamerTableComponent, AptamerTableRow, SelectionCycleMetrics } from '../shared/aptamer-table/aptamer-table.component';
import { ChartDialogTriggerComponent } from '../shared/chart-dialog-trigger/chart-dialog-trigger.component';
import { ExperimentReport, SelectionCycleResponse } from '../../models/experiment-report';
import { FsbcAnalysis, FsbcClusterSeed, FsbcStringResult } from '../../models/fsbc-analysis';
import { FsbcConfiguration } from '../../models/fsbc-configuration';
import { ExperimentChartService } from '../../services/experiment-chart.service';
import { FsbcApiService } from '../../services/fsbc-api.service';
import { ThemeService } from '../../services/theme.service';

type FsbcClusterRow = FsbcClusterSeed & {
  aptamerIds: number[];
};

@Component({
  selector: 'app-fsbc-analysis-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatDialogModule,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatRippleModule,
    MatSelectModule,
    MatSlideToggle,
    MatTableModule,
    NgxEchartsDirective,
    FormField,
    AptamerTableComponent,
    Listbox,
    Option,
    ChartDialogTriggerComponent
  ],
  templateUrl: './fsbc-analysis-tab.component.html',
  styleUrl: './fsbc-analysis-tab.component.scss'
})
export class FsbcAnalysisTabComponent {
  readonly themeService = inject(ThemeService);
  private readonly fsbcApi = inject(FsbcApiService);
  private readonly chartService = inject(ExperimentChartService);
  private readonly dialog = inject(MatDialog);

  readonly experimentId = input.required<string>();
  readonly experimentReport = input.required<ExperimentReport>();
  readonly fsbcDialog = viewChild.required<TemplateRef<void>>('fsbcDialog');

  readonly analysesRes = this.fsbcApi.getAnalysesRes(this.experimentId);

  readonly runFormModel = signal({
    selectionCycleRound: null as number | null,
    minLength: 5,
    maxLength: 10,
    rnaSequence: false,
  });
  readonly runForm = form(this.runFormModel, (path) => {
    required(path.selectionCycleRound);
    required(path.minLength);
    min(path.minLength, 1);
    required(path.maxLength);
    min(path.maxLength, 1);
    required(path.rnaSequence);
  });

  readonly sequenceTableFormModel = signal({
    showPrimers: false,
    useCPM: true
  });
  readonly sequenceTableForm = form(this.sequenceTableFormModel);

  readonly isSubmitting = signal(false);
  readonly deletingAnalysisId = signal<string | null>(null);

  readonly positiveSelectionCycles = computed(() =>
    [...this.experimentReport().selectionCycles]
      .filter((cycle) => !cycle.isControlSelection && !cycle.isCounterSelection)
      .sort((left, right) => left.round - right.round)
  );

  readonly sortedAnalyses = computed<FsbcAnalysis[]>(() => {
    const analyses = this.analysesRes.value() ?? [];
    return [...analyses].sort((left, right) =>
      new Date(right.createdAt ?? 0).getTime() - new Date(left.createdAt ?? 0).getTime()
    );
  });

  readonly selectedAnalysisId = signal<string | null>(null);
  readonly activeAnalysis = computed<FsbcAnalysis | null>(() => {
    const analyses = this.sortedAnalyses();
    if (analyses.length === 0) {
      return null;
    }

    const selectedId = this.selectedAnalysisId();
    if (selectedId) {
      const selected = analyses.find((analysis) => analysis.id === selectedId);
      if (selected) {
        return selected;
      }
    }

    return analyses[0];
  });

  readonly aptamerToCluster = computed<Record<number, number>>(() => {
    const mapping = this.activeAnalysis()?.aptamerToCluster ?? {};
    return Object.fromEntries(
      Object.entries(mapping).map(([key, value]) => [Number(key), value])
    );
  });

  readonly clusterRows = computed<FsbcClusterRow[]>(() => {
    const analysis = this.activeAnalysis();
    if (!analysis) {
      return [];
    }

    return analysis.clusterSeeds
      .map((seed) => ({
        ...seed,
        aptamerIds: Object.entries(this.aptamerToCluster())
          .filter(([, clusterId]) => clusterId === seed.clusterId)
          .map(([aptamerId]) => Number(aptamerId))
      }))
      .sort((left, right) => right.totalCount - left.totalCount || left.clusterId - right.clusterId);
  });

  readonly displayedStrings = computed<FsbcStringResult[]>(() => this.activeAnalysis()?.rankedStrings ?? []);
  readonly selectedClusterId = signal<number | null>(null);
  readonly selectedString = signal<string | null>(null);
  readonly selectedAptamerRows = signal<AptamerTableRow[]>([]);
  readonly clusterOverviewMetric = signal<'totalCounts' | 'memberCounts'>('totalCounts');

  readonly selectedCluster = computed<FsbcClusterRow | null>(() => {
    const clusterId = this.selectedClusterId();
    return clusterId === null
      ? null
      : this.clusterRows().find((cluster) => cluster.clusterId === clusterId) ?? null;
  });

  readonly referenceSelectionCycle = computed<SelectionCycleResponse | null>(() => {
    const cycles = this.positiveSelectionCycles();
    if (cycles.length === 0) {
      return null;
    }

    const round = this.activeAnalysis()?.requestConfig.selectionCycleRound;
    return cycles.find((cycle) => cycle.round === round) ?? cycles.at(-1) ?? null;
  });

  private readonly allAptamerRows = computed<AptamerTableRow[]>(() => {
    const { idToAptamer, idToBounds } = this.experimentReport().pool;
    const sortedCycles = [...this.experimentReport().selectionCycles].sort((left, right) => left.round - right.round);

    return Object.entries(idToAptamer).map(([id, sequence]) => {
      const aptamerId = Number(id);
      const cycles: Record<number, SelectionCycleMetrics> = {};
      let previousFrequency = 0;

      for (const cycle of sortedCycles) {
        const count = cycle.counts[aptamerId] ?? 0;
        const frequency = cycle.totalSize > 0 ? count / cycle.totalSize : 0;
        const cpm = frequency * 1_000_000;
        const enrichment = previousFrequency > 0 ? frequency / previousFrequency : null;

        cycles[cycle.round] = { count, cpm, frequency, enrichment };
        previousFrequency = frequency;
      }

      return {
        id: aptamerId,
        sequence,
        bounds: idToBounds[aptamerId],
        cycles
      };
    });
  });

  readonly aptamersInSelectedCluster = computed(() => {
    const cluster = this.selectedCluster();
    if (!cluster) {
      return [] as AptamerTableRow[];
    }

    const ids = new Set(cluster.aptamerIds);
    return this.allAptamerRows().filter((row) => ids.has(row.id));
  });

  readonly rankedStringsChartOptions = this.chartService.getFsbcRankedStringsChart(this.displayedStrings);
  readonly stringScatterChartOptions = this.chartService.getFsbcStringScatterChart(this.displayedStrings);
  readonly clusterOverviewChartOptions = this.chartService.getFsbcClusterOverviewChart(
    this.clusterRows,
    this.clusterOverviewMetric
  );
  readonly clusterSequenceLogoChartOptions = this.chartService.getClusterSequenceLogoChart(
    this.aptamersInSelectedCluster,
    this.referenceSelectionCycle
  );
  readonly clusterMutationRatesChartOptions = this.chartService.getClusterMutationRatesChart(
    this.aptamersInSelectedCluster,
    this.referenceSelectionCycle
  );
  readonly selectedAptamerCardinalityChartOptions = this.chartService.getSelectedAptamerCardinalityChart(
    this.experimentReport,
    this.selectedAptamerRows,
    this.sequenceTableForm.useCPM().value,
    signal<'counts' | 'enrichments'>('counts')
  );

  readonly fsbcRunInvalid = computed(() =>
    this.runForm().invalid() || this.runForm.minLength().value() > this.runForm.maxLength().value()
  );

  readonly clusterTableColumns = ['clusterId', 'seedString', 'memberCount', 'totalCount'];
  readonly stringTableColumns = ['rank', 'subsequence', 'length', 'observedCount', 'normalizedZScore'];

  constructor() {
    effect(() => {
      const cycles = this.positiveSelectionCycles();
      if (cycles.length === 0) {
        return;
      }

      const selectedRound = this.runForm.selectionCycleRound().value();
      if (!cycles.some((cycle) => cycle.round === selectedRound)) {
        this.runForm.selectionCycleRound().value.set(cycles.at(-1)!.round);
      }
    });

    effect(() => {
      const clusters = this.clusterRows();
      const selectedClusterId = this.selectedClusterId();
      if (clusters.length === 0) {
        this.selectedClusterId.set(null);
        this.selectedAptamerRows.set([]);
        return;
      }

      if (selectedClusterId === null || !clusters.some((cluster) => cluster.clusterId === selectedClusterId)) {
        this.selectedClusterId.set(clusters[0].clusterId);
      }
    });

    effect(() => {
      const strings = this.displayedStrings();
      const selected = this.selectedString();
      if (strings.length === 0) {
        this.selectedString.set(null);
        return;
      }

      if (!selected || !strings.some((entry) => entry.subsequence === selected)) {
        this.selectedString.set(this.selectedCluster()?.seedString ?? strings[0].subsequence);
      }
    });
  }

  selectAnalysis(analysisId: string) {
    this.selectedAnalysisId.set(analysisId);
    this.selectedClusterId.set(null);
    this.selectedString.set(null);
    this.selectedAptamerRows.set([]);
  }

  selectCluster(clusterId: number) {
    this.selectedClusterId.set(clusterId);
    this.selectedAptamerRows.set([]);
    const cluster = this.clusterRows().find((item) => item.clusterId === clusterId);
    if (cluster) {
      this.selectedString.set(cluster.seedString);
    }
  }

  selectString(subsequence: string) {
    this.selectedString.set(subsequence);
  }

  runFsbcAnalysis() {
    const experimentId = this.experimentId();
    if (!experimentId || this.isSubmitting() || this.fsbcRunInvalid()) {
      return;
    }

    const payload: FsbcConfiguration = {
      selectionCycleRound: this.runForm.selectionCycleRound().value(),
      minLength: this.runForm.minLength().value(),
      maxLength: this.runForm.maxLength().value(),
      rnaSequence: this.runForm.rnaSequence().value(),
    };

    this.isSubmitting.set(true);
    this.fsbcApi.createAnalysis(experimentId, payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => {
          this.selectedAnalysisId.set(null);
          this.selectedClusterId.set(null);
          this.selectedString.set(null);
          this.selectedAptamerRows.set([]);
          this.analysesRes.reload();
        },
        error: (error) => {
          console.error('Failed to run FSBC', error);
        }
      });
  }

  deleteAnalysis(analysisId: string) {
    const experimentId = this.experimentId();
    if (!experimentId || !analysisId || this.deletingAnalysisId()) {
      return;
    }

    this.deletingAnalysisId.set(analysisId);
    this.fsbcApi.deleteAnalysis(experimentId, analysisId)
      .pipe(finalize(() => this.deletingAnalysisId.set(null)))
      .subscribe({
        next: () => {
          if (this.selectedAnalysisId() === analysisId) {
            this.selectedAnalysisId.set(null);
            this.selectedClusterId.set(null);
            this.selectedString.set(null);
            this.selectedAptamerRows.set([]);
          }
          this.analysesRes.reload();
        },
        error: (error) => {
          console.error('Failed to delete FSBC analysis', error);
        }
      });
  }

  openFsbcDialog() {
    this.dialog.open(this.fsbcDialog(), {
      autoFocus: false,
      width: '720px',
      maxWidth: 'calc(100vw - 32px)'
    });
  }

  formatAnalysisMeta(analysis: FsbcAnalysis) {
    return `Round ${analysis.requestConfig.selectionCycleRound} • ${analysis.clusterCount} clusters • ${analysis.stringCount} strings`;
  }

  formatDuration(durationMs: number) {
    return `${(durationMs / 1000).toFixed(2)} s`;
  }
}
