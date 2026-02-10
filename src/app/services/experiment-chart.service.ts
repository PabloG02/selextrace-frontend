import {computed, inject, Injectable, Signal} from '@angular/core';
import {ExperimentReport, SelectionCycleResponse} from '../models/experiment-report';
import {EChartsOption} from 'echarts';
import {PredictionsApiService} from './predictions-api.service';

@Injectable({
  providedIn: 'root'
})
export class ExperimentChartService {
  private readonly predictionsApiService = inject(PredictionsApiService);

  // --- Experiment Overview tab ---

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
    const distributionByCycle = exp.metadata?.nucleotideDistributionAccepted;
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
      if (!exp?.selectionCycleResponse?.length) {
        return {};
      }

      const cycles = exp.selectionCycleResponse
        .filter(cycle => !cycle.isControlSelection && !cycle.isCounterSelection)
        .sort((a, b) => (a.round - b.round));
      if (cycles.length === 0) {
        return {};
      }

      const stats = cycles.map(cycle => this.computeSelectionCycleStats(cycle, singletonCutoff()));

      return {
        title: { text: 'Positive Selection Cycles' },
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
      if (!exp?.metadata?.nucleotideDistributionForward || !cycle) {
        return {};
      }

      const distribution = exp.metadata.nucleotideDistributionForward[cycle.name];
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
      if (!exp?.metadata?.nucleotideDistributionReverse || !cycle) return {};

      const distribution = exp.metadata.nucleotideDistributionReverse[cycle.name];
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
      if (!exp?.metadata?.nucleotideDistributionAccepted || !cycle) return {};

      const distributionByCycle = exp.metadata.nucleotideDistributionAccepted[cycle.name];
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

      // 1) DATA INPUT
      const data = contextProbabilities.value();

      const seriesConfigs = [
        { key: 'paired', name: 'Paired', color: '#c8c8c8', imageUrl: 'assets/P.png' },
        { key: 'hairpin', name: 'Hairpin', color: '#ff7070', imageUrl: 'assets/H.png' },
        { key: 'bulge', name: 'Bulge', color: '#fa9600', imageUrl: 'assets/B.png' },
        { key: 'internal', name: 'Internal', color: '#a0a0ff', imageUrl: 'assets/I.png' },
        { key: 'multi', name: 'Multi', color: '#00ffff', imageUrl: 'assets/M.png' },
        { key: 'dangling', name: 'Dangling', color: '#ffc0cb', imageUrl: 'assets/D.png' },
      ] as const;

      const rawData = seriesConfigs.reduce<Record<string, number[]>>((acc, config) => {
        acc[config.name] = data[config.key] ?? [];
        return acc;
      }, {});

      const categories = seriesConfigs.map(config => config.name);
      const sequenceLength = Math.max(...categories.map(cat => rawData[cat].length));
      if (!sequenceLength) {
        return {};
      }

      const colorMap = seriesConfigs.reduce<Record<string, string>>((acc, config) => {
        acc[config.name] = config.color;
        return acc;
      }, {});

      // 2) PREPARE DATA FOR CUSTOM SERIES (SORTING LOGIC)
      const xAxisData: string[] = [];

      for (let i = 0; i < sequenceLength; i += 1) {
        xAxisData.push(`${i + 1}`);

        const stackForPosition = categories.map(category => ({
          name: category,
          value: rawData[category][i]
        }));

        stackForPosition.sort((a, b) => a.value - b.value);
      }

      return {
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
                  return b.value - a.value; // sort by value (desc)
                }
                return a.name.localeCompare(b.name); // then by name (asc)
              });

            const rows = entries
              .map(entry =>
                `<tr>
                  <td><strong style="display:inline-block;color:${entry.color};margin-right:4px;">${entry.name.charAt(0)}</strong></td>
                  <td>${entry.name}</td>
                  <td style="padding-left: 16px; text-align: right;"><strong>${entry.value}</strong></td>
                </tr>`
              )
              .join('');

            return `<table>${rows}</table>`;
          }
        },
        legend: { bottom: 0 },
        dataZoom: [
          { type: 'slider', show: sequenceLength > 30, start: 0, end: 50 },
          { type: 'inside' }
        ],
        xAxis: {
          type: 'category',
          name: 'Sequence Position',
          data: xAxisData,
          axisLabel: {
            interval: 0
          }
        },
        yAxis: {
          type: 'value',
          name: 'Probability',
          min: 0,
          max: 1
        },
        series: seriesConfigs.map(config => ({
          name: config.name,
          type: 'custom',
          itemStyle: {
            color: config.color
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
                image: config.imageUrl,
                x: start[0] - width / 2,
                y: end[1],
                width,
                height
              }
            };
          },
          data: (() => {
            const seriesData: Array<[number, number, number]> = [];
            for (let i = 0; i < sequenceLength; i++) {
              const stackForPosition = categories.map(cat => ({
                name: cat,
                value: rawData[cat][i]
              }));
              stackForPosition.sort((a, b) => a.value - b.value);

              let yStart = 0;
              for (let j = 0; j < stackForPosition.length; j++) {
                if (stackForPosition[j].name === config.name) {
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
    });
  }

}

interface SelectionCycleStats {
  label: string;
  uniqueFraction: number;
  singletonFrequency: number;
  enrichedFrequency: number;
}
