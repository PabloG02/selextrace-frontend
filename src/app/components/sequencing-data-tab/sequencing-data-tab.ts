import {Component, computed, effect, inject, input, linkedSignal, signal} from '@angular/core';
import {ExperimentChartService} from '../../services/experiment-chart.service';
import {ExperimentReport, SelectionCycleResponse} from '../../models/experiment-report';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {FormsModule} from '@angular/forms';
import {MatDivider} from '@angular/material/list';
import {MatFormField, MatLabel} from '@angular/material/input';
import {MatOption, MatSelect} from '@angular/material/select';
import {NgxEchartsDirective} from 'ngx-echarts';
import {form, FormField, required} from '@angular/forms/signals';
import {DecimalPipe, KeyValuePipe} from '@angular/common';
import {MatButtonToggle, MatButtonToggleGroup} from '@angular/material/button-toggle';
import {ThemeService} from '../../services/theme.service';

@Component({
  selector: 'app-sequencing-data-tab',
  imports: [
    MatCard,
    MatCardContent,
    FormsModule,
    MatDivider,
    MatFormField,
    MatLabel,
    MatSelect,
    MatCardHeader,
    MatCardTitle,
    NgxEchartsDirective,
    FormField,
    MatOption,
    KeyValuePipe,
    DecimalPipe,
    MatButtonToggleGroup,
    MatButtonToggle
  ],
  templateUrl: './sequencing-data-tab.html',
  styleUrl: './sequencing-data-tab.scss'
})
export class SequencingDataTab {
  /* Services */
  readonly themeService = inject(ThemeService);
  private readonly chartService = inject(ExperimentChartService);
  /* Inputs */
  readonly experimentReport = input.required<ExperimentReport>();
  readonly selectionCycles = computed(() => this.experimentReport().selectionCycleResponse);
  readonly selectedCycle = linkedSignal<SelectionCycleResponse | null>(() => {
    const cycles = this.selectionCycles();
    if (cycles.length === 0) return null;

    const selectedName = this.sequencingForm.selectedCycleName().value();
    return cycles.find(cycle => cycle.name === selectedName) ?? cycles[0];
  });
  /* Computed Properties */
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

  readonly baseDistributionPercentages = computed(() => {
    const report = this.experimentReport();
    const cycle = this.selectedCycle();
    if (!report) return null;
    if (!cycle) return null;

    const acceptedByCycle = report.metadata.nucleotideDistributionAccepted[cycle.name];
    if (!acceptedByCycle) return null;

    let adenineTotal = 0;
    let cytosineTotal = 0;
    let guanineTotal = 0;
    let thymineTotal = 0;

    for (const sizeBucket of Object.values(acceptedByCycle)) {
      for (const positionCounts of Object.values(sizeBucket)) {
        adenineTotal += positionCounts[65] ?? 0;
        cytosineTotal += positionCounts[67] ?? 0;
        guanineTotal += positionCounts[71] ?? 0;
        thymineTotal += positionCounts[84] ?? 0;
      }
    }

    const totalCount = adenineTotal + cytosineTotal + guanineTotal + thymineTotal;
    if (totalCount === 0) return null;

    const toPercent = (value: number) => ((value / totalCount) * 100);
    return {
      A: toPercent(adenineTotal),
      C: toPercent(cytosineTotal),
      G: toPercent(guanineTotal),
      T: toPercent(thymineTotal)
    };
  });

  /* State */
  readonly sequencingFormModel = signal({
    axisUnit: 'count',
    axisScale: 'linear',
    selectedRegionSize: 0,
    selectedCycleName: null as string | null,
  });
  readonly sequencingForm = form(this.sequencingFormModel, (p) => {
    required(p.axisUnit);
    required(p.axisScale);
    required(p.selectedRegionSize);
  });

  /* Charts */
  readonly forwardReadsNucleotideDistributionRawChartOptions = this.chartService.getForwardReadsNucleotideDistributionRawChart(
    this.experimentReport,
    linkedSignal(() => this.sequencingForm.axisUnit().value() == 'percentage'),
    this.selectedCycle
  );
  readonly reverseReadsNucleotideDistributionRawChartOptions = this.chartService.getReverseReadsNucleotideDistributionRawChart(
    this.experimentReport,
    linkedSignal(() => this.sequencingForm.axisUnit().value() == 'percentage'),
    this.selectedCycle
  );
  readonly acceptedReadsNucleotideDistributionChartOptions = this.chartService.getAcceptedReadNucleotideDistributionChart(
    this.experimentReport,
    linkedSignal(() => this.sequencingForm.axisUnit().value() == 'percentage'),
    this.sequencingForm.selectedRegionSize().value,
    this.selectedCycle
  );

  constructor() {
    effect(() => {
      const cycles = this.selectionCycles();
      const selectedName = this.sequencingForm.selectedCycleName().value();
      if (!selectedName && cycles.length > 0) {
        this.sequencingForm.selectedCycleName().value.set(cycles[0].name);
      }
    });

    effect(() => {
      const sizes = this.randomizedRegionSizes();
      if (!sizes) return;

      if (sizes.length > 0 && this.sequencingForm.selectedRegionSize().value() === 0) {
        this.sequencingForm.selectedRegionSize().value.set(sizes[0]);
      }
    });
  }
}
