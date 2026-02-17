import {ChangeDetectionStrategy, Component, computed, effect, inject, input, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatChipsModule} from '@angular/material/chips';
import {MatDividerModule} from '@angular/material/divider';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatListModule} from '@angular/material/list';
import {MatSelectModule} from '@angular/material/select';
import {MatButtonToggleModule} from '@angular/material/button-toggle';
import {ExperimentReport} from '../../models/experiment-report';
import {ClustersApiService} from '../../services/clusters-api.service';
import {ClusterAnalysis} from '../../models/cluster-analysis';
import {AptaClusterConfiguration} from '../../models/aptacluster-configuration';
import {finalize} from 'rxjs';
import {form, FormField, min, required} from '@angular/forms/signals';
import {AptamerTableComponent, AptamerTableRow, SelectionCycleMetrics} from '../shared/aptamer-table/aptamer-table.component';
import {ClusterTableComponent, ClusterTableRow} from '../shared/cluster-table/cluster-table.component';
import {
  MatAccordion,
  MatExpansionPanel,
  MatExpansionPanelHeader,
  MatExpansionPanelTitle
} from '@angular/material/expansion';
import {NgxEchartsDirective} from 'ngx-echarts';
import {ExperimentChartService} from '../../services/experiment-chart.service';
import {MatSlideToggle} from '@angular/material/slide-toggle';

@Component({
  selector: 'app-aptamer-family-analysis-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSelectModule,
    MatButtonToggleModule,
    FormField,
    AptamerTableComponent,
    ClusterTableComponent,
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    NgxEchartsDirective,
    MatSlideToggle
  ],
  templateUrl: './aptamer-family-analysis-tab.component.html',
  styleUrl: './aptamer-family-analysis-tab.component.scss',
})
export class AptamerFamilyAnalysisTab {
  private readonly clustersApi = inject(ClustersApiService);
  private readonly chartService = inject(ExperimentChartService);

  /* Inputs */
  readonly experimentId = input.required<string>();
  readonly experimentReport = input.required<ExperimentReport>();

  /* Resources */
  /** Resource containing all cluster analyses for the current experiment */
  readonly clusterAnalysesRes = this.clustersApi.getAnalysesRes(this.experimentId);

  /* Form State (AptaCluster Params)  */
  readonly clusteringFormModel = signal({
    randomizedRegionSize: 0,
    localitySensitiveHashingDimensions: NaN,
    localitySensitiveHashingIterations: 5,
    editDistance: 5,
    kmerSize: 3,
    kmerCutoffIterations: 10000,
  });
  readonly clusteringForm = form(this.clusteringFormModel, (p) => {
    required(p.randomizedRegionSize);
    required(p.localitySensitiveHashingDimensions);
    min(p.localitySensitiveHashingDimensions, 1);
    required(p.localitySensitiveHashingIterations);
    required(p.editDistance);
    required(p.kmerSize);
    required(p.kmerCutoffIterations);
  });

  /* Reactive Signal Form Model */
  readonly sequenceTableFormModel = signal({
    showPrimers: false,
    useCPM: true,
  });
  readonly sequenceTableForm = form(this.sequenceTableFormModel);

  /** Tracks whether the clustering analysis is running */
  readonly isSubmitting = signal(false);

  /* Form: Select options */
  readonly randomizedRegionSizes = computed(() => {
    const accepted = this.experimentReport()?.metadata.nucleotideDistributionAccepted;
    if (!accepted) return [];

    // Flatten all keys across size maps
    return [
      ...new Set(
        Object.values(accepted).flatMap(sizeMap => Object.keys(sizeMap).map(Number))
      )
    ];
  });

  /** LSH dimension options (1 to randomizedRegionSize) */
  readonly localitySensitiveHashingDimensionOptions = computed(() => {
    const size = this.clusteringForm.randomizedRegionSize().value();
    if (!size || size <= 0) return [];

    return Array.from({ length: size }, (_, i) => i + 1);
  });

  /** LSH iteration options (1 to 20) */
  readonly localitySensitiveHashingIterationOptions = Array.from({ length: 20 }, (_, i) => i + 1);

  /* Analysis Selection Logic */
  /** All available analyses sorted by creation date (newest first) */
  readonly sortedAnalyses = computed<ClusterAnalysis[]>(() => {
    const analyses = this.clusterAnalysesRes.value() ?? [];
    return [...analyses].sort((a, b) =>
      new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
    );
  });

  /** User-selected analysis ID */
  readonly selectedAnalysisId = signal<string | null>(null);

  /**
   * Currently active analysis for display.
   * Returns user selection if present, otherwise defaults to the newest analysis.
   */
  readonly activeAnalysis = computed<ClusterAnalysis | null>(() => {
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

  /* Cluster Table Data */
  /** Map of aptamer ID to cluster ID from the active analysis. */
  readonly aptamerToCluster = computed<Record<number, number>>(() => {
    const map = this.activeAnalysis()?.aptamerToCluster;
    if (!map) return {};

    return Object.fromEntries(
      Object.entries(map).map(([key, value]) => [Number(key), value])
    );
  });

  /** Aggregated cluster data with metrics. */
  readonly clusters = computed(() => {
    const clusterMap = new Map<number, ClusterTableRow>();
    const counts = this.experimentReport().selectionCycleResponse[0].counts;

    // Group aptamers by cluster
    Object.entries(this.aptamerToCluster()).forEach(([aptamerIdStr, clusterId]) => {
      const aptamerId = Number(aptamerIdStr);

      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, {
          clusterId,
          aptamerIds: [],
          diversity: 0,
          size: 0
        });
      }

      const cluster = clusterMap.get(clusterId)!;
      cluster.aptamerIds.push(aptamerId);
      cluster.size += counts[aptamerId] || 0;
    });

    // Calculate diversity and convert to array
    const clusters = Array.from(clusterMap.values());
    clusters.forEach(cluster => {
      cluster.diversity = cluster.aptamerIds.length;
    });

    return clusters;
  });

  /** Currently selected cluster ID for detail view */
  readonly selectedClusterId = signal<number>(NaN);

  /** Full cluster object for the selected cluster ID */
  readonly selectedCluster = computed(() => {
    const selectedId = this.selectedClusterId();
    if (Number.isNaN(selectedId)) return null;
    return this.clusters().find(cluster => cluster.clusterId === selectedId) ?? null;
  });

  /* Cluster Table Data */
  /** All aptamers from the experiment formatted as table rows. */
  private readonly allAptamerRows = computed(() => {
    const { idToAptamer, idToBounds, selectionCycleResponse } = this.experimentReport();
    return Object.entries(idToAptamer).map(([id, sequence]) => {
      const aptamerId = Number(id);

      const cycles: Record<number, SelectionCycleMetrics> = Object.fromEntries(
        selectionCycleResponse.map(cycle => {
          const count = cycle.counts[aptamerId];
          const frequency = count / cycle.totalSize;
          const cpm = frequency * 1_000_000;

          return [cycle.round, { count, cpm, frequency }];
        })
      );

      return {
        id: aptamerId,
        sequence,
        bounds: idToBounds[aptamerId],
        cycles
      } as AptamerTableRow;
    });
  });

  /** Aptamer rows filtered to only those in the currently selected cluster */
  readonly aptamersInSelectedCluster = computed(() => {
    const cluster = this.selectedCluster();
    if (!cluster) return [] as AptamerTableRow[];

    const ids = new Set(cluster.aptamerIds);
    return this.allAptamerRows().filter(row => ids.has(row.id));
  });

  // TODO
  readonly referenceSelectionCycle = computed(() => this.experimentReport().selectionCycleResponse[0] ?? null);

  /* Charts */
  readonly clusterSequenceLogoChartOptions = this.chartService.getClusterSequenceLogoChart(
    this.aptamersInSelectedCluster,
    this.referenceSelectionCycle
  );

  readonly clusterMutationRatesChartOptions = this.chartService.getClusterMutationRatesChart(
    this.aptamersInSelectedCluster,
    this.referenceSelectionCycle
  );

  constructor() {
    // Auto-set LSH dimensions to 75% of region size when region size changes
    effect(() => {
      const size = this.clusteringForm.randomizedRegionSize().value();
      if (!size || size <= 0) {
        this.clusteringForm.localitySensitiveHashingDimensions().value.set(0);
        return;
      }

      const defaultValue = Math.max(1, Math.floor(size * 0.75));
      this.clusteringForm.localitySensitiveHashingDimensions().value.set(defaultValue);
    });
  }

  /**
   * Selects a specific cluster analysis for viewing.
   * Resets cluster selection when switching analyses.
   */
  selectAnalysis(analysisId: string) {
    this.selectedAnalysisId.set(analysisId);
    this.selectedClusterId.set(NaN);
  }

  /** Selects a specific cluster for detailed aptamer view */
  selectCluster(id: number) {
    this.selectedClusterId.set(id);
  }

  /**
   * Submits clustering job with current form parameters.
   * Reloads analysis list upon completion.
   */
  runClustering(): void {
    const experimentId = this.experimentId();
    if (!experimentId || this.isSubmitting()) return;

    const payload: AptaClusterConfiguration = {
      randomizedRegionSize: this.clusteringForm.randomizedRegionSize().value(),
      lshDimension: this.clusteringForm.localitySensitiveHashingDimensions().value(),
      editDistance: this.clusteringForm.editDistance().value(),
      lshIterations: this.clusteringForm.localitySensitiveHashingIterations().value(),
      kmerSize: this.clusteringForm.kmerSize().value(),
      kmerCutoffIterations: this.clusteringForm.kmerCutoffIterations().value(),
    };

    this.isSubmitting.set(true);
    this.clustersApi.createAnalysis(experimentId, payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: () => this.clusterAnalysesRes.reload(),
        error: (error) => {
          console.error('Failed to run clustering', error);
        }
      });
  }
}
