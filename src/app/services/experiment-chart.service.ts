import {computed, inject, Injectable, Signal} from '@angular/core';
import {ExperimentReport, SelectionCycleResponse} from '../models/experiment-report';
import {EChartsOption} from 'echarts';
import {PredictionsApiService} from './predictions-api.service';
import {AptamerTableRow} from '../components/shared/aptamer-table/aptamer-table.component';
import {MotifAnalysisProfile} from '../models/motif-analysis';
import {FsbcStringResult} from '../models/fsbc-analysis';

type LogoType = 'nucleotide' | 'structure';

interface LogoConfig {
  categories: string[];
  colors: string[];
  images: string[];
  apiKeys?: string[];
}

const LOGO_CONFIGS: Record<LogoType, LogoConfig> = {
  nucleotide: {
    categories: ['A', 'C', 'G', 'T'],
    colors: ['#2e7d32', '#1e88e5', '#fb8c00', '#e53935'],
    images: ['assets/A.png', 'assets/C.png', 'assets/G.png', 'assets/T.png']
  },
  structure: {
    categories: ['Hairpin', 'Bulge', 'Internal', 'Multi', 'Dangling', 'Paired'],
    colors: ['#ff7070', '#fa9600', '#a0a0ff', '#00ffff', '#ffc0cb', '#c8c8c8'],
    images: ['assets/H.png', 'assets/B.png', 'assets/I.png', 'assets/M.png', 'assets/D.png', 'assets/P.png'],
    apiKeys: ['hairpin', 'bulge', 'internal', 'multi', 'dangling', 'paired']
  }
};

@Injectable({
  providedIn: 'root'
})
export class ExperimentChartService {
  private readonly predictionsApiService = inject(PredictionsApiService);

  // --- Experiment Overview tab ---

  getSelectionCyclePercentagesChart(experimentReport: Signal<ExperimentReport | undefined>) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      if (!exp || exp.importStats.totalAcceptedReads <= 0 || !exp.selectionCycles?.length) {
        return {};
      }

      const data = exp.selectionCycles
        .map((cycle) => ({
          name: cycle.name,
          value: (cycle.totalSize * 100) / exp.importStats.totalAcceptedReads,
          round: cycle.round,
        }))
        .sort((a, b) => a.round - b.round || a.name.localeCompare(b.name))
        .map(({ name, value }) => ({ name, value }));
      if (data.length === 0) {
        return {};
      }
      const percentageByName = new Map(data.map(({ name, value }) => [name, value]));

      return {
        grid: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
        textStyle: {
          fontFamily: 'Geist, sans-serif',
        },
        tooltip: {
          show: false,
        },
        legend: {
          orient: 'vertical',
          left: 0,
          top: 0,
          itemGap: 10,
          textStyle: {
            fontSize: 14,
            fontWeight: 600,
          },
          formatter: (name: string) => {
            const percentage = percentageByName.get(name)?.toFixed(3);
            return percentage === undefined ? name : `${name}: ${percentage}%`;
          },
        },
        series: [
          {
            name: 'Selection Cycle',
            type: 'pie',
            radius: ['40%', '70%'],
            avoidLabelOverlap: false,
            itemStyle: {
              borderRadius: 10,
              borderColor: '#fff',
              borderWidth: 4,
            },
            label: {
              show: false,
              position: 'center',
              formatter: (params) => {
                const percentage = percentageByName.get(params.name)?.toFixed(3);
                return percentage === undefined ? params.name : `${params.name}\n${percentage}%`;
              },
            },
            emphasis: {
              label: {
                show: true,
                fontSize: 22,
                fontWeight: 'bold',
              },
            },
            labelLine: {
              show: false,
            },
            data,
          },
        ],
      };
    });
  }

  getRandomizedRegionSizeDistributionChart(
    experimentReport: Signal<ExperimentReport | undefined>,
    axisUnit: Signal<'count' | 'percentage'>,
    axisScale: Signal<'linear' | 'logarithmic'>
  ) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      if (!exp) {
        return {};
      }

      const { distribution, total } = this.buildRandomizedRegionSizeDistribution(exp);
      const numericKeys = Object.keys(distribution).map(Number);
      const maxKey = Math.max(...numericKeys);

      // Generate continuous range from 0 to (maxKey + 4)
      const allKeys = Array.from({ length: maxKey + 5 }, (_, i) => i);

      const isPercentage = axisUnit() === 'percentage';

      const values = allKeys.map(k => {
        // Map values, defaulting to 0 for missing keys.
        const rawValue = distribution[k] ?? 0;
        return isPercentage && total > 0 ? (rawValue / total) * 100 : rawValue;
      });

      const yAxisName = isPercentage ? 'Percentage of Occurrence' : 'Frequency of Occurrence';

      return {
        grid: {
          left: 0,
          right: 0,
        },
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
          name: yAxisName,
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

  private buildRandomizedRegionSizeDistribution(exp: ExperimentReport) {
    const distributionByCycle = exp.technicalDetails?.metadata.nucleotideDistributionAccepted;
    const totals: Record<number, number> = {};
    let total = 0;

    for (const cycleEntry of Object.values(distributionByCycle)) {
      for (const [sizeStr, positions] of Object.entries(cycleEntry)) {
        const size = Number(sizeStr);
        const positionZero = positions[0];
        // Only sum counts from position 0 (to match original behavior)
        const sum = Object.values(positionZero).reduce((acc, value) => acc + value, 0);
        totals[size] = (totals[size] ?? 0) + sum;
        total += sum;
      }
    }

    return { distribution: totals, total };
  }

  getPositiveSelectionCyclesChart(experimentReport: Signal<ExperimentReport | undefined>, singletonCutoff: Signal<number>) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      if (!exp?.selectionCycles?.length) {
        return {};
      }

      const cycles = exp.selectionCycles
        .filter(cycle => !cycle.isControlSelection && !cycle.isCounterSelection)
        .sort((a, b) => (a.round - b.round));
      if (cycles.length === 0) {
        return {};
      }

      const stats = cycles.map(cycle => this.computeSelectionCycleStats(cycle, singletonCutoff()));

      return {
        title: { text: 'Positive Selection Cycles' },
        grid: {
          left: 0,
          right: 0,
        },
        legend: { bottom: 0 },
        tooltip: {},
        xAxis: {
          type: 'category',
          name: 'Cycle Number/Name',
          nameLocation: 'middle',
          data: stats.map(entry => entry.label),
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
            data: stats.map(entry => entry.singletonFrequency),
            itemStyle: { color: '#f26c22' },
          },
          {
            type: 'bar',
            name: 'Enriched Species',
            data: stats.map(entry => entry.enrichedFrequency),
            itemStyle: { color: '#f9a825' },
          },
          {
            type: 'bar',
            name: 'Unique Fraction',
            data: stats.map(entry => entry.uniqueFraction),
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

  getForwardReadsNucleotideDistributionRawChart(
    experimentReport: Signal<ExperimentReport | undefined>,
    showPercentage: Signal<boolean>,
    selectedCycle: Signal<SelectionCycleResponse | null>
  ) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      const cycle = selectedCycle();
      if (!exp?.technicalDetails?.metadata.nucleotideDistributionForward || !cycle) {
        return {};
      }

      const distribution = exp.technicalDetails.metadata.nucleotideDistributionForward[cycle.name];
      if (!distribution) {
        return {};
      }
      const positions = Object.keys(distribution).map(Number).sort((a, b) => a - b);

      const seriesA = positions.map(pos => {
        let val = distribution[pos][65] ?? 0; // 'A' = 65
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      const seriesC = positions.map(pos => {
        let val = distribution[pos][67] ?? 0; // 'C' = 67
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      const seriesG = positions.map(pos => {
        let val = distribution[pos][71] ?? 0; // 'G' = 71
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      const seriesT = positions.map(pos => {
        let val = distribution[pos][84] ?? 0; // 'T' = 84
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      return {
        title: { text: 'Forward Reads Nucleotide Distribution (raw)' },
        grid: {
          left: 0,
          right: 0,
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
    showPercentage: Signal<boolean>,
    selectedCycle: Signal<SelectionCycleResponse | null>
  ) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      const cycle = selectedCycle();
      if (!exp?.technicalDetails?.metadata.nucleotideDistributionReverse || !cycle) return {};

      const distribution = exp.technicalDetails.metadata.nucleotideDistributionReverse[cycle.name];
      if (!distribution || Object.keys(distribution).length === 0) {
        // No paired-end data
        return {};
      }

      const positions = Object.keys(distribution).map(Number).sort((a, b) => a - b);

      const seriesA = positions.map(pos => {
        let val = distribution[pos][65] ?? 0; // 'A' = 65
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      const seriesC = positions.map(pos => {
        let val = distribution[pos][67] ?? 0; // 'C' = 67
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      const seriesG = positions.map(pos => {
        let val = distribution[pos][71] ?? 0; // 'G' = 71
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      const seriesT = positions.map(pos => {
        let val = distribution[pos][84] ?? 0; // 'T' = 84
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      return {
        title: { text: 'Reverse Reads Nucleotide Distribution (raw)' },
        grid: {
          left: 0,
          right: 0,
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

  getAcceptedReadNucleotideDistributionChart(
    experimentReport: Signal<ExperimentReport | undefined>,
    showPercentage: Signal<boolean>,
    selectedRegionSize: Signal<number>,
    selectedCycle: Signal<SelectionCycleResponse | null>
  ) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      const cycle = selectedCycle();
      if (!exp?.technicalDetails?.metadata.nucleotideDistributionAccepted || !cycle) return {};

      const distributionByCycle = exp.technicalDetails.metadata.nucleotideDistributionAccepted[cycle.name];
      if (!distributionByCycle) return {};

      const regionSize = selectedRegionSize();
      const distribution = distributionByCycle[regionSize];
      if (!distribution) return {}; // skip if no reads accepted for this size

      const positions = Object.keys(distribution).map(Number).sort((a, b) => a - b);

      const seriesA = positions.map(pos => {
        let val = distribution[pos][65] ?? 0; // 'A' = 65
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      const seriesC = positions.map(pos => {
        let val = distribution[pos][67] ?? 0; // 'C' = 67
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      const seriesG = positions.map(pos => {
        let val = distribution[pos][71] ?? 0; // 'G' = 71
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      const seriesT = positions.map(pos => {
        let val = distribution[pos][84] ?? 0; // 'T' = 84
        if (showPercentage()) val = (val / cycle.totalSize) * 100;
        return val;
      });

      return {
        title: {
          text: `Randomized Region Nucleotide Distribution (filtered, ${regionSize} nt)`
        },
        grid: {
          left: 0,
          right: 0,
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

  // --- Aptamer Pool tab ---

  getSelectedAptamerCardinalityChart(
    experimentReport: Signal<ExperimentReport | undefined>,
    rows: Signal<AptamerTableRow[]>,
    useCPM: Signal<boolean>,
    metric: Signal<'counts' | 'enrichments'>
  ) {
    return computed<EChartsOption>(() => {
      console.log(rows());
      if (metric() !== 'counts') {
        return {};
      }

      const exp = experimentReport();
      const selectedRows = rows();
      if (!exp?.selectionCycles?.length || !selectedRows.length) {
        return {};
      }

      const positiveCycles = exp.selectionCycles
        .filter(cycle => !cycle.isControlSelection && !cycle.isCounterSelection)
        .sort((a, b) => a.round - b.round);
      if (positiveCycles.length === 0) {
        return {};
      }

      const cycleLabels = positiveCycles.map(cycle => cycle.name);
      const yAxisName = useCPM() ? 'Counts per Million (CPM)' : 'Counts';

      return {
        grid: {
          left: 0,
          right: 0,
        },
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0 },
        xAxis: {
          type: 'category',
          name: 'Selection Cycle',
          data: cycleLabels
        },
        yAxis: {
          type: 'value',
          name: yAxisName,
          min: 0
        },
        series: selectedRows.map(row => ({
          name: `#${row.id}`,
          type: 'line',
          data: positiveCycles.map(cycle => {
            const value = row.cycles[cycle.round];
            return useCPM() ? value.cpm : value.count;
          })
        }))
      };
    });
  }

  getMotifCoverageChart(
    experimentReport: Signal<ExperimentReport | undefined>,
    motifProfile: Signal<MotifAnalysisProfile | null>,
    selectedCycle: Signal<SelectionCycleResponse | null>,
    useCpm: Signal<boolean>
  ) {
    return computed<EChartsOption>(() => {
      const exp = experimentReport();
      const profile = motifProfile();
      const cycle = selectedCycle();
      if (!exp || !profile || !cycle || cycle.totalSize <= 0) {
        return {};
      }

      const kmerList = [...new Set(profile.kmers.map((kmer) => kmer.trim().toUpperCase()).filter(Boolean))];
      if (kmerList.length === 0 || profile.memberAptamers.length === 0) {
        return {};
      }

      const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patterns = kmerList.map((kmer) => new RegExp(escapeRegExp(kmer), 'g'));

      let maxRegionSize = 0;
      const occurrences: number[] = [];

      for (const member of profile.memberAptamers) {
        const aptamerId = member.aptamerId;
        const sequence = exp.pool.idToAptamer[aptamerId];
        const bounds = exp.pool.idToBounds[aptamerId];
        if (!sequence || !bounds) {
          continue;
        }

        const count = cycle.counts[aptamerId];
        if (count <= 0) {
          continue;
        }

        const contribution = useCpm() ? (count / cycle.totalSize) * 1_000_000 : count;
        if (contribution <= 0) {
          continue;
        }

        const region = sequence.slice(bounds.startIndex, bounds.endIndex).toUpperCase();
        maxRegionSize = Math.max(maxRegionSize, region.length);

        for (const pattern of patterns) {
          pattern.lastIndex = 0;
          let match = pattern.exec(region);
          while (match) {
            const start = match.index;
            const end = start + match[0].length;
            for (let idx = start; idx < end; idx += 1) {
              occurrences[idx] = (occurrences[idx] ?? 0) + contribution;
            }
            match = pattern.exec(region);
          }
        }
      }

      if (maxRegionSize === 0) {
        return {};
      }

      const data = Array.from({length: maxRegionSize}, (_, index) => occurrences[index] ?? 0);

      return {
        grid: {
          left: 0,
          right: 0,
        },
        tooltip: {trigger: 'axis'},
        xAxis: {
          type: 'category',
          name: 'Randomized Region Index',
          nameLocation: 'middle',
          data: Array.from({length: maxRegionSize}, (_, index) => index),
        },
        yAxis: {
          type: 'value',
          name: `Motif Coverage${useCpm() ? ' (CPM)' : ''}`,
          nameLocation: 'middle',
          nameRotate: 90,
        },
        series: [
          {
            type: 'line',
            areaStyle: {},
            data,
          },
        ],
      };
    });
  }

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

  getContextProbabilitySequenceLogoChart(sequence: Signal<string | null>) {
    const contextProbabilities = this.predictionsApiService.getContextProbabilities(sequence);

    return computed<EChartsOption>(() => {
      if (!sequence() || !contextProbabilities.hasValue()) {
        return {};
      }

      const data = contextProbabilities.value();
      const config = LOGO_CONFIGS['structure'];

      const frequencies = config.apiKeys!.map(key => data[key as keyof typeof data] ?? []);

      return this.buildSequenceLogoChart(
        'structure',
        frequencies,
        'Sequence Position',
        'Probability'
      );
    });
  }

  // --- Aptamer Family Analysis tab ---

  /**
   * Builds a cluster sequence logo using the first selection cycle for weights.
   * Falls back to uniform weighting when cycle counts are missing.
   */
  getClusterSequenceLogoChart(
    rows: Signal<AptamerTableRow[]>,
    referenceCycle: Signal<SelectionCycleResponse | null>
  ) {
    return computed<EChartsOption>(() => {
      const aptamersInCluster = rows();
      const cycle = referenceCycle();
      if (!aptamersInCluster.length || !cycle) return {};

      const seedRow = this.pickSeedRow(aptamersInCluster, cycle.round);
      if (!seedRow.bounds) return {};

      const start = seedRow.bounds.startIndex;
      const end = seedRow.bounds.endIndex;
      const regionLength = end - start;
      if (regionLength <= 0) return {};

      const seedSequence = seedRow.sequence;
      if (seedSequence.length < end) return {};

      const nucleotideOrder = ['A', 'C', 'G', 'T'] as const;
      const counts: number[][] = nucleotideOrder.map(() => Array(regionLength).fill(0));

      const weights = aptamersInCluster.map(row => this.getRowCount(row, cycle.round));
      const clusterSize = aptamersInCluster.length;

      aptamersInCluster.forEach((row, index) => {
        const sequence = row.sequence;
        const bounds = row.bounds;
        if (!sequence || !bounds) return;
        if (bounds.startIndex !== start || bounds.endIndex !== end) return;

        const weight = weights[index];
        if (weight <= 0) return;

        for (let i = 0; i < regionLength; i += 1) {
          const base = sequence[start + i]?.toUpperCase();
          const idx = nucleotideOrder.indexOf(base as typeof nucleotideOrder[number]);
          if (idx >= 0) {
            counts[idx][i] += weight;
          }
        }
      });

      const rawFrequencies = counts.map(series => series.map(value => value / clusterSize));
      const maxFrequency = Math.max(...rawFrequencies.flat());
      const normalizedFrequencies = rawFrequencies.map(series => series.map(value => value / maxFrequency));

      return this.buildSequenceLogoChart(
        'nucleotide',
        normalizedFrequencies,
        'Sequence Position',
        'Frequency',
        undefined,
        3
      );
    });
  }

  /**
   * Builds mutation rates relative to the cluster seed sequence (highest-count row).
   * Uses per-aptamer counts for weighting when available.
   */
  getClusterMutationRatesChart(
    rows: Signal<AptamerTableRow[]>,
    referenceCycle: Signal<SelectionCycleResponse | null>
  ) {
    return computed<EChartsOption>(() => {
      const aptamersInCluster = rows();
      const cycle = referenceCycle();
      if (!aptamersInCluster.length || !cycle) return {};

      const seedRow = this.pickSeedRow(aptamersInCluster, cycle.round);
      if (!seedRow.bounds) return {};

      const start = seedRow.bounds.startIndex;
      const end = seedRow.bounds.endIndex;
      const regionLength = end - start;
      if (regionLength <= 0) return {};

      const seedSequence = seedRow.sequence;
      if (seedSequence.length < end) return {};

      const nucleotideOrder = ['A', 'C', 'G', 'T'] as const;
      const mutations: number[][] = nucleotideOrder.map(() => Array(regionLength).fill(0));

      const weights = aptamersInCluster.map(row => this.getRowCount(row, cycle.round));
      const clusterSize = aptamersInCluster.length;

      aptamersInCluster.forEach((row, index) => {
        const sequence = row.sequence;
        const bounds = row.bounds;
        if (!sequence || !bounds) return;
        if (bounds.startIndex !== start || bounds.endIndex !== end) return;

        const weight = weights[index];
        if (weight <= 0) return;

        for (let i = 0; i < regionLength; i++) {
          const base = sequence[start + i]?.toUpperCase();
          const seedBase = seedSequence[start + i]?.toUpperCase();
          if (base === seedBase) continue;

          const idx = nucleotideOrder.indexOf(base as typeof nucleotideOrder[number]);
          if (idx >= 0) {
            mutations[idx][i] += weight;
          }
        }
      });

      const mutationFrequencies = mutations.map(series => series.map(value => value / clusterSize));
      const xAxisData = Array.from({ length: regionLength }, (_, i) => {
        const seedBase = seedSequence[start + i]?.toUpperCase() ?? '-';
        return `${seedBase} (${i + 1})`;
      });

      const colors = LOGO_CONFIGS['nucleotide'].colors;

      return {
        grid: {
          left: 0,
          right: 0,
        },
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: { bottom: 0 },
        dataZoom: [
          { type: 'slider', show: regionLength > 30, start: 0, end: 50 },
          { type: 'inside' }
        ],
        xAxis: {
          type: 'category',
          name: 'Seed Position',
          data: xAxisData
        },
        yAxis: {
          type: 'value',
          name: 'Mutation Frequency',
          min: 0,
          max: 1
        },
        series: nucleotideOrder.map((label, idx) => ({
          name: label,
          type: 'bar',
          stack: 'mutations',
          data: mutationFrequencies[idx],
          itemStyle: { color: colors[idx] }
        }))
      };
    });
  }

  /**
   * Picks a representative seed aptamer based on the highest count in the reference round.
   */
  private pickSeedRow(rows: AptamerTableRow[], round: number) {
    let seed = rows[0];
    let maxCount = this.getRowCount(seed, round);

    for (let i = 1; i < rows.length; i++) {
      const count = this.getRowCount(rows[i], round);
      if (count > maxCount) {
        maxCount = count;
        seed = rows[i];
      }
    }

    return seed;
  }

  /**
   * Returns the count for a given row and selection round, or 0 when missing.
   */
  private getRowCount(row: AptamerTableRow, round: number) {
    return row.cycles[round].count;
  }

  // --- FSBC Analysis tab ---

  getFsbcRankedStringsChart(strings: Signal<FsbcStringResult[]>) {
    return computed<EChartsOption>(() => {
      const topStrings = strings().slice(0, 20);
      if (topStrings.length === 0) {
        return {};
      }

      const labels = [...topStrings].map((entry) => `${entry.subsequence} (${entry.length})`).reverse();
      const values = [...topStrings].map((entry) => entry.normalizedZScore).reverse();

      return {
        grid: {
          left: 140,
          right: 16,
          top: 8,
          bottom: 24
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' }
        },
        xAxis: {
          type: 'value',
          name: 'Normalized Z-score'
        },
        yAxis: {
          type: 'category',
          data: labels
        },
        series: [
          {
            type: 'bar',
            data: values,
            itemStyle: {
              color: '#0b6e4f'
            }
          }
        ]
      };
    });
  }

  getFsbcStringScatterChart(strings: Signal<FsbcStringResult[]>) {
    return computed<EChartsOption>(() => {
      const values = strings();
      if (values.length === 0) {
        return {};
      }

      const observedCounts = values.map((entry) => entry.observedCount);
      const minObserved = Math.min(...observedCounts);
      const maxObserved = Math.max(...observedCounts);
      const normalizeSize = (observedCount: number) => {
        if (minObserved === maxObserved) {
          return 18;
        }
        return 10 + ((observedCount - minObserved) / (maxObserved - minObserved)) * 22;
      };

      return {
        grid: {
          left: 0,
          right: 0
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: unknown) => {
            const entry = params as {
              data?: {
                subsequence?: string;
                length?: number;
                normalizedZScore?: number;
                observedCount?: number;
                zScore?: number;
              };
            };
            const data = entry.data;
            if (!data) return '';
            return `${data.subsequence}<br/>Length: ${data.length}<br/>Observed: ${data.observedCount}<br/>Z-score: ${data.zScore?.toFixed(3)}<br/>Normalized Z: ${data.normalizedZScore?.toFixed(3)}`;
          }
        },
        xAxis: {
          type: 'value',
          name: 'String Length',
          minInterval: 1
        },
        yAxis: {
          type: 'value',
          name: 'Normalized Z-score'
        },
        series: [
          {
            type: 'scatter',
            data: values.map((entry) => ({
              value: [entry.length, entry.normalizedZScore],
              subsequence: entry.subsequence,
              length: entry.length,
              normalizedZScore: entry.normalizedZScore,
              observedCount: entry.observedCount,
              zScore: entry.zScore,
              symbolSize: normalizeSize(entry.observedCount),
            })),
            itemStyle: {
              color: '#1e88e5',
              opacity: 0.78
            }
          }
        ]
      };
    });
  }

  getFsbcClusterOverviewChart(
    clusters: Signal<Array<{ clusterId: number; seedString: string; memberCount: number; totalCount: number }>>,
    metric: Signal<'totalCounts' | 'memberCounts'>
  ) {
    return computed<EChartsOption>(() => {
      const clusterRows = [...clusters()].sort((left, right) => right.totalCount - left.totalCount).slice(0, 20);
      if (clusterRows.length === 0) {
        return {};
      }

      const showTotalCounts = metric() === 'totalCounts';
      return {
        grid: {
          left: 0,
          right: 0,
          bottom: 40
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' }
        },
        xAxis: {
          type: 'category',
          data: clusterRows.map((cluster) => `#${cluster.clusterId}`),
          name: 'Cluster'
        },
        yAxis: {
          type: 'value',
          name: showTotalCounts ? 'Total Count' : 'Members'
        },
        series: [
          {
            type: 'bar',
            data: clusterRows.map((cluster) => showTotalCounts ? cluster.totalCount : cluster.memberCount),
            itemStyle: {
              color: '#fb8c00'
            }
          }
        ]
      };
    });
  }

  // --- Motif Analysis tab ---

  getMotifSequenceLogoChart(motifProfile: Signal<MotifAnalysisProfile | null>) {
    return computed<EChartsOption>(() => {
      const profile = motifProfile();
      if (!profile?.pwm?.length) {
        return {};
      }

      const normalizedPwm = this.normalizeMotifMatrix(profile.pwm, 4);

      return this.buildSequenceLogoChart(
        'nucleotide',
        normalizedPwm,
        'Motif Position',
        'Frequency'
      );
    });
  }

  getMotifContextTraceChart(
    motifProfile: Signal<MotifAnalysisProfile | null>,
    roundLabels: Signal<string[]>
  ) {
    return computed<EChartsOption>(() => {
      const profile = motifProfile();
      if (!profile?.contextTrace?.length) {
        return {};
      }

      const normalizedContextTrace = this.normalizeMotifMatrix(profile.contextTrace, 6);

      const seriesLength = Math.max(...normalizedContextTrace.map((series) => series.length));
      const labels = roundLabels();
      const xAxisData = Array.from({length: seriesLength}, (_, index) => labels[index]);

      return this.buildSequenceLogoChart(
        'structure',
        normalizedContextTrace,
        'Selection Cycle',
        'Context Frequency',
        xAxisData,
        3
      );
    });
  }

  /**
   * Creates a stacked image-based sequence logo using the provided per-position frequencies.
   */
  private buildSequenceLogoChart(
    logoType: LogoType,
    frequencies: number[][],
    xAxisLabel: string,
    yAxisLabel: string,
    xAxisData?: string[],
    tooltipDecimals?: number
  ): EChartsOption {
    const config = LOGO_CONFIGS[logoType];
    const sequenceLength = Math.max(...frequencies.map(series => series.length));
    if (!sequenceLength) return {};

    // If xAxisData is provided and has entries, use it. Otherwise, generate default labels (1, 2, 3, ...).
    const resolvedXAxisData = xAxisData?.length
      ? xAxisData
      : Array.from({ length: sequenceLength }, (_, i) => `${i + 1}`);

    const colorMap = config.categories.reduce<Record<string, string>>((acc, category, index) => {
      acc[category] = config.colors[index] ?? '#6d6e73';
      return acc;
    }, {});

    return {
      grid: {
        left: 0,
        right: 0,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          if (!Array.isArray(params) || params.length === 0) {
            return '';
          }

          const entries = params
            .map(item => {
              const entry = item as {
                seriesName?: string;
                value?: unknown;
              };
              const rawValue = Array.isArray(entry.value) ? entry.value[2] : entry.value;
              const value = typeof rawValue === 'number' ? rawValue : 0;
              const name = entry.seriesName ?? '';
              return {
                color: colorMap[name] ?? '#6d6e73',
                name,
                value
              };
            })
            .sort((a, b) => {
              if (b.value !== a.value) {
                return b.value - a.value;
              }
              return a.name.localeCompare(b.name);
            });

          const rows = entries
            .map(entry => {
              // Conditionally format the number
              const displayValue = tooltipDecimals !== undefined
                ? entry.value.toFixed(tooltipDecimals)
                : entry.value;

              return `<tr>
                <td><strong style="display:inline-block;color:${entry.color};margin-right:4px;">${entry.name.charAt(0)}</strong></td>
                <td>${entry.name}</td>
                <td style="padding-left: 16px; text-align: right;"><strong>${displayValue}</strong></td>
              </tr>`;
            })
            .join('');

          return `<table>${rows}</table>`;
        }
      },
      legend: { bottom: 0 },
      ...(sequenceLength > 30 ? {
        dataZoom: [
          { type: 'slider', show: true, start: 0, end: 50 },
          { type: 'inside' }
        ]
      } : {}),
      xAxis: {
        type: 'category',
        name: xAxisLabel,
        data: resolvedXAxisData,
        axisLabel: { interval: 0 }
      },
      yAxis: {
        type: 'value',
        name: yAxisLabel,
        min: 0,
        max: 1
      },
      series: config.categories.map((category, index) => ({
        name: category,
        type: 'custom',
        itemStyle: {
          color: config.colors[index] ?? '#6d6e73'
        },
        renderItem: (params, api) => {
          const xIndex = api.value(0) as number;
          const yStart = api.value(1) as number;
          const valHeight = api.value(2) as number;

          const start = api.coord([xIndex, yStart]);
          const end = api.coord([xIndex, yStart + valHeight]);
          const height = Math.abs(start[1] - end[1]);
          // TODO: fix ts-ignore
          // @ts-ignore
          const width = api.size([1, 0])[0] * 0.98;

          return {
            type: 'image',
            style: {
              image: config.images[index],
              x: start[0] - width / 2,
              y: end[1],
              width,
              height
            }
          };
        },
        data: (() => {
          const seriesData: Array<[number, number, number]> = [];
          for (let i = 0; i < sequenceLength; i += 1) {
            const stackForPosition = config.categories.map((cat, catIndex) => ({
              name: cat,
              value: frequencies[catIndex]?.[i] ?? 0
            }));
            stackForPosition.sort((a, b) => a.value - b.value);

            let yStart = 0;
            for (let j = 0; j < stackForPosition.length; j += 1) {
              if (stackForPosition[j].name === category) {
                seriesData.push([i, yStart, stackForPosition[j].value]);
                break;
              }
              yStart += stackForPosition[j].value;
            }
          }
          return seriesData;
        })(),
      }))
    };
  }

  /**
   * Ensure motif matrices are shaped as [series][position].
   * Accepts either N x seriesCount or seriesCount x N.
   */
  private normalizeMotifMatrix(matrix: number[][], seriesCount: number) {
    if (matrix.length === seriesCount) {
      return matrix;
    }

    const firstRowLength = matrix[0].length;
    if (firstRowLength === seriesCount) {
      return this.transposeMatrix(matrix);
    }

    throw new Error('Unexpected motif matrix shape: neither dimension matches series count');
  }

  private transposeMatrix(matrix: number[][]) {
    const rowCount = matrix.length;
    const colCount = Math.max(...matrix.map((row) => row.length));
    const result: number[][] = Array.from({length: colCount}, () => Array(rowCount).fill(0));

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
      for (let colIndex = 0; colIndex < colCount; colIndex += 1) {
        result[colIndex][rowIndex] = matrix[rowIndex]?.[colIndex] ?? 0;
      }
    }

    return result;
  }

  /**
   * Builds the cluster cardinality chart (CPM) for the selected cluster.
   */
  getClusterCardinalityChart(
    experimentReport: Signal<ExperimentReport>,
    rows: Signal<AptamerTableRow[]>,
    metric: Signal<'sizes' | 'diversities'>
  ) {
    return computed<EChartsOption>(() => {
      const aptamersInCluster = rows();
      const cycles = experimentReport().selectionCycles;
      if (!aptamersInCluster.length || !cycles.length) {
        return {};
      }

      const data = cycles.map(cycle => {
        let rawSize = 0;
        let rawDiversity = 0;

        for (const row of aptamersInCluster) {
          const count = this.getRowCount(row, cycle.round);
          if (count > 0) {
            rawSize += count;
            rawDiversity += 1;
          }
        }

        const uniqueSize = cycle.uniqueSize;
        const cpmSize = (rawSize / uniqueSize) * 1_000_000;
        const cpmDiversity = (rawDiversity / uniqueSize) * 1_000_000;

        return {
          label: `Round ${cycle.round} (${cycle.name})`,
          size: cpmSize,
          diversity: cpmDiversity
        };
      });

      const showSizes = metric() === 'sizes';
      const seriesName = showSizes ? 'Cluster Sizes (CPM)' : 'Cluster Diversities (CPM)';

      return {
        grid: {
          left: 0,
          right: 0,
        },
        tooltip: { trigger: 'axis' },
        legend: { bottom: 0 },
        xAxis: {
          type: 'category',
          name: 'Selection Cycle',
          data: data.map(entry => entry.label)
        },
        yAxis: {
          type: 'value',
          name: seriesName,
          min: 0
        },
        series: [
          {
            name: seriesName,
            type: 'bar',
            data: data.map(entry => (showSizes ? entry.size : entry.diversity)),
          }
        ]
      };
    });
  }

  /**
   * Builds a scatter plot comparing CPM values between two selection cycles.
   */
  getClusterEnrichmentScatterChart(
    rows: Signal<AptamerTableRow[]>,
    referenceCycle: Signal<SelectionCycleResponse>,
    compareToCycle: Signal<SelectionCycleResponse>,
    scale: Signal<'linear' | 'logarithmic'>
  ) {
    return computed<EChartsOption>(() => {
      const aptamers = rows();
      const reference = referenceCycle();
      const compareTo = compareToCycle();

      if (!aptamers.length || !reference || !compareTo) {
        return {};
      }

      const isLog = scale() === 'logarithmic';
      const points = aptamers.map(row => {
        const referenceCpm = row.cycles[reference.round].cpm;
        const compareCpm = row.cycles[compareTo.round].cpm;
        const x = isLog ? Math.log(referenceCpm): referenceCpm;
        const y = isLog ? Math.log(compareCpm) : compareCpm;

        return {
          id: row.id,
          x,
          y,
          referenceCpm,
          compareCpm
        };
      });

      return {
        grid: {
          left: 0,
          right: 0,
        },
        tooltip: {
          trigger: 'item',
          formatter: (params: unknown) => {
            const entry = params as { data?: { id?: number; referenceCpm?: number; compareCpm?: number } };
            const data = entry.data;
            if (!data) return '';
            // TODO: Revise tooltip content
            return `#${data.id}<br/>${reference.name}: ${data.referenceCpm?.toFixed(2)} CPM<br/>${compareTo.name}: ${data.compareCpm?.toFixed(2)} CPM`;
          }
        },
        xAxis: {
          type: isLog? 'log' : 'value',
          name: `${reference.name} (CPM)`,
          min: 0,
          nameLocation: 'middle',
          nameGap: 30
        },
        yAxis: {
          type: isLog? 'log' : 'value',
          name: `${compareTo.name} (CPM)`,
          min: 0,
          nameLocation: 'middle',
          nameRotate: 90,
        },
        series: [
          {
            type: 'scatter',
            data: points.map(point => ({
              value: [point.x, point.y],
              id: point.id,
              referenceCpm: point.referenceCpm,
              compareCpm: point.compareCpm
            }))
          }
        ]
      };
    });
  }

}

interface SelectionCycleStats {
  label: string;
  uniqueFraction: number;
  singletonFrequency: number;
  enrichedFrequency: number;
}
