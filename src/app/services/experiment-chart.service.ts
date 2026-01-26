import {computed, inject, Injectable, Signal} from '@angular/core';
import {ExperimentReport} from '../models/experiment-report';
import {EChartsOption} from 'echarts';
import {PredictionsApiService} from './predictions-api.service';

@Injectable({
  providedIn: 'root'
})
export class ExperimentChartService {
  private readonly predictionsApiService = inject(PredictionsApiService);

  // --- Experiment Overview tab ---

  getRandomizedRegionSizeDistributionChart(experimentReport: Signal<ExperimentReport | undefined>) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      if (!exp?.randomizedRegionSizeDistribution) {
        return {};
      }

      const distribution = exp.randomizedRegionSizeDistribution.data;

      // Convert keys to numbers and sort
      const numericKeys = Object.keys(distribution).map(Number);
      const maxKey = Math.max(...numericKeys);

      // Generate continuous range from 0 to (maxKey + 4)
      const allKeys = Array.from({ length: maxKey + 5 }, (_, i) => i);

      // Map values, defaulting to 0 if missing
      const values = allKeys.map(k => distribution[k] ?? 0);

      return {
        legend: {
          bottom: 0,
        },
        tooltip: {},
        xAxis: {
          type: 'category',
          name: 'Randomized Region Size',
          nameLocation: 'middle',
          data: allKeys
        },
        yAxis: {
          type: 'value',
          name: 'Frequency of Occurrence',
          nameLocation: 'middle',
          nameRotate: 90,
        },
        series: [{
          type: 'bar',
          name: 'Randomized Region Sizes in the Aptamer Pool',
          data: values
        }],
      };
    });
  }

  getPositiveSelectionCyclesChart(experimentReport: Signal<ExperimentReport | undefined>, singletonCutoff: Signal<number>) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      if (!exp?.selectionCycleResponse) {
        return {};
      }

      const cycle = exp.selectionCycleResponse;

      const stats = this.computeSelectionCycleStats(cycle, singletonCutoff());

      return {
        title: { text: 'Positive Selection Cycles' },
        legend: { bottom: 0 },
        tooltip: {},
        xAxis: {
          type: 'category',
          name: 'Cycle Number/Name',
          nameLocation: 'middle',
          data: [stats.label],
        },
        yAxis: {
          type: 'value',
          name: 'Percentage',
          nameLocation: 'middle',
          nameRotate: 90,
          min: 0,
          max: 100,
          axisLabel: { formatter: '{value}%' },
        },
        series: [
          {
            type: 'bar',
            name: 'Singletons',
            data: [stats.singletonFrequency],
            itemStyle: { color: '#f26c22' },
          },
          {
            type: 'bar',
            name: 'Enriched Species',
            data: [stats.enrichedFrequency],
            itemStyle: { color: '#f9a825' },
          },
          {
            type: 'bar',
            name: 'Unique Fraction',
            data: [stats.uniqueFraction],
            itemStyle: { color: '#43a047' },
          },
        ],
      };
    });
  }

  private computeSelectionCycleStats(
    cycle: SelectionCycleResponse,
    singletonCutoff: number
  ): SelectionCycleStats {
    const label = `Round ${cycle.round} (${cycle.name})`;

    // Unique fraction (% of unique vs total)
    const uniqueFraction = (cycle.uniqueSize / cycle.totalSize) * 100;

    let singletonCount = 0;
    let enrichedCount = 0;

    for (const [count, freq] of Object.entries(cycle.counts)) {
      if (freq > singletonCutoff) {
        enrichedCount++;
      } else {
        singletonCount++;
      }
    }

    const singletonFrequency = (singletonCount / cycle.uniqueSize) * 100;
    const enrichedFrequency = (enrichedCount / cycle.uniqueSize) * 100;

    return { label, uniqueFraction, singletonFrequency, enrichedFrequency };
  }

  // --- Sequencing Data tab ---

  selectedCycleName: string = 'r14'; // TODO: get from backend
  getForwardReadsNucleotideDistributionRawChart(experimentReport: Signal<ExperimentReport | undefined>, showPercentage: Signal<boolean>) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      if (!exp?.selectionCycleComposition) {
        return {};
      }

      const distribution = exp.metadata.nucleotideDistributionForward[this.selectedCycleName];
      const positions = Object.keys(distribution).map(Number).sort((a, b) => a - b);

      const seriesA = positions.map(pos => {
        let val = distribution[pos][65] ?? 0; // 'A' = 65
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'forward')) * 100;
        return val;
      });

      const seriesC = positions.map(pos => {
        let val = distribution[pos][67] ?? 0; // 'C' = 67
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'forward')) * 100;
        return val;
      });

      const seriesG = positions.map(pos => {
        let val = distribution[pos][71] ?? 0; // 'G' = 71
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'forward')) * 100;
        return val;
      });

      const seriesT = positions.map(pos => {
        let val = distribution[pos][84] ?? 0; // 'T' = 84
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'forward')) * 100;
        return val;
      });

      return {
        title: { text: 'Forward Reads Nucleotide Distribution (raw)' },
        legend: { data: ['A', 'C', 'G', 'T'] },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          name: 'Nucleotide Index',
          data: positions.map(String)
        },
        yAxis: {
          type: 'value',
          name: (showPercentage()) ? 'Percentage' : 'Frequency'
        },
        series: [
          { name: 'A', type: 'line', data: seriesA },
          { name: 'C', type: 'line', data: seriesC },
          { name: 'G', type: 'line', data: seriesG },
          { name: 'T', type: 'line', data: seriesT }
        ]
      };
    });
  }

  getReverseReadsNucleotideDistributionRawChart(
    experimentReport: Signal<ExperimentReport | undefined>,
    showPercentage: Signal<boolean>
  ) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      if (!exp?.metadata?.nucleotideDistributionReverse) return {};

      const distribution = exp.metadata.nucleotideDistributionReverse[this.selectedCycleName];
      if (!distribution || Object.keys(distribution).length === 0) {
        // No paired-end data
        return {};
      }

      const positions = Object.keys(distribution).map(Number).sort((a, b) => a - b);

      const seriesA = positions.map(pos => {
        let val = distribution[pos][65] ?? 0; // 'A' = 65
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'reverse')) * 100;
        return val;
      });

      const seriesC = positions.map(pos => {
        let val = distribution[pos][67] ?? 0; // 'C' = 67
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'reverse')) * 100;
        return val;
      });

      const seriesG = positions.map(pos => {
        let val = distribution[pos][71] ?? 0; // 'G' = 71
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'reverse')) * 100;
        return val;
      });

      const seriesT = positions.map(pos => {
        let val = distribution[pos][84] ?? 0; // 'T' = 84
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'reverse')) * 100;
        return val;
      });

      return {
        title: { text: 'Reverse Reads Nucleotide Distribution (raw)' },
        legend: { data: ['A', 'C', 'G', 'T'] },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          name: 'Nucleotide Index',
          data: positions.map(String)
        },
        yAxis: {
          type: 'value',
          name: showPercentage() ? 'Percentage' : 'Frequency'
        },
        series: [
          { name: 'A', type: 'line', data: seriesA },
          { name: 'C', type: 'line', data: seriesC },
          { name: 'G', type: 'line', data: seriesG },
          { name: 'T', type: 'line', data: seriesT }
        ]
      };
    });
  }

  getAcceptedReadNucleotideDistributionChart(
    experimentReport: Signal<ExperimentReport | undefined>,
    showPercentage: Signal<boolean>,
    selectedRegionSize: Signal<number>
  ) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      if (!exp?.metadata?.nucleotideDistributionAccepted) return {};

      const distributionByCycle = exp.metadata.nucleotideDistributionAccepted[this.selectedCycleName];
      if (!distributionByCycle) return {};

      const regionSize = selectedRegionSize();
      const distribution = distributionByCycle[regionSize];
      if (!distribution) return {}; // skip if no reads accepted for this size

      const positions = Object.keys(distribution).map(Number).sort((a, b) => a - b);

      const seriesA = positions.map(pos => {
        let val = distribution[pos][65] ?? 0; // 'A' = 65
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'accepted')) * 100;
        return val;
      });

      const seriesC = positions.map(pos => {
        let val = distribution[pos][67] ?? 0; // 'C' = 67
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'accepted')) * 100;
        return val;
      });

      const seriesG = positions.map(pos => {
        let val = distribution[pos][71] ?? 0; // 'G' = 71
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'accepted')) * 100;
        return val;
      });

      const seriesT = positions.map(pos => {
        let val = distribution[pos][84] ?? 0; // 'T' = 84
        if (showPercentage()) val = (val / this.getCycleSize(exp, 'accepted')) * 100;
        return val;
      });

      return {
        title: {
          text: `Randomized Region Nucleotide Distribution (filtered, ${regionSize} nt)`
        },
        legend: { data: ['A', 'C', 'G', 'T'] },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          name: 'Nucleotide Index',
          data: positions.map(String)
        },
        yAxis: {
          type: 'value',
          name: showPercentage() ? 'Percentage' : 'Frequency'
        },
        series: [
          { name: 'A', type: 'line', data: seriesA },
          { name: 'C', type: 'line', data: seriesC },
          { name: 'G', type: 'line', data: seriesG },
          { name: 'T', type: 'line', data: seriesT }
        ]
      };
    });
  }

  private getCycleSize(exp: ExperimentReport, type: 'forward' | 'reverse' | 'accepted'): number {
    // calculate total reads for selected cycle, e.g. sum of position 0 counts
    const distribution =
      type === 'forward' ? exp.metadata.nucleotideDistributionForward[this.selectedCycleName]
      : type === 'reverse' ? exp.metadata.nucleotideDistributionReverse[this.selectedCycleName]
          : exp.metadata.nucleotideDistributionAccepted[this.selectedCycleName][40]; // TODO: fix hardcoded size
    if (!distribution) return 1;
    const pos0 = distribution[0];
    if (!pos0) return 1;
    return (pos0[65] ?? 0) + (pos0[67] ?? 0) + (pos0[71] ?? 0) + (pos0[84] ?? 0);
  }

  // --- Aptamer Pool tab ---

  getBasePairProbabilityMatrixHeatmapChart(sequence: Signal<string | null>) {
    const raggedUpperTriangleMatrix = this.predictionsApiService.getBppm(sequence);

    return computed<EChartsOption>(() => {
      if (!sequence() || !raggedUpperTriangleMatrix.hasValue()) {
        return {};
      }

      const sequenceChars = [...sequence()!];

      // ECharts heatmap expects data as [x,y,value]
      const heatmapData = raggedUpperTriangleMatrix.value().matrix.flatMap((row, i) =>
        row.map((value, j) => {
          const col = i + 1 + j;
          return [col, i, value];  // SWAP: [col, row, value] instead of [row, col, value]
        })
      );

      return {
        tooltip: {
          position: 'top',
        },
        grid: { height: '80%', width: '80%', left: '10%', top: '10%' },
        xAxis: {
          type: 'category',
          position: 'top',
          data: sequenceChars,
          splitArea: { show: true }
        },
        yAxis: {
          type: 'category',
          data: sequenceChars,
          splitArea: { show: true },
          inverse: true
        },
        visualMap: {
          min: 0,
          max: 1,
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: '5%',
          inRange: {
            color: ['#ffffff', '#000000']  // White (0) to Black (1)
          }
        },
        series: [{
          name: 'BPPM',
          type: 'heatmap',
          data: heatmapData,
          progressive: 2000,
          emphasis: {
            itemStyle: {
              borderColor: '#333',
              borderWidth: 1
            }
          }
        }]
      };
    });
  }

}

interface SelectionCycleResponse {
  name: string;
  round: number;
  totalSize: number;
  uniqueSize: number;
  counts: Record<number, number>; // count -> frequency
}

interface SelectionCycleStats {
  label: string;
  uniqueFraction: number;
  singletonFrequency: number;
  enrichedFrequency: number;
}
