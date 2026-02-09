import {Component, computed, effect, inject, input, linkedSignal, signal} from '@angular/core';
import {ExperimentChartService} from '../../services/experiment-chart.service';
import {ExperimentReport} from '../../models/experiment-report';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {FormsModule} from '@angular/forms';
import {MatDivider} from '@angular/material/list';
import {MatFormField, MatLabel} from '@angular/material/input';
import {MatOption, MatSelect} from '@angular/material/select';
import {NgxEchartsDirective} from 'ngx-echarts';
import {FormField, form, required} from '@angular/forms/signals';
import {DecimalPipe, KeyValuePipe} from '@angular/common';

@Component({
  selector: 'app-sequencing-data-tab',
  imports: [
    MatCard,
    MatCardContent,
    MatRadioGroup,
    MatRadioButton,
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
    DecimalPipe
  ],
  templateUrl: './sequencing-data-tab.html',
  styleUrl: './sequencing-data-tab.scss'
})
export class SequencingDataTab {
  /* Services */
  private readonly chartService = inject(ExperimentChartService);
  /* Inputs */
  readonly experimentReport = input.required<ExperimentReport>();
  /* Computed Properties */
  readonly randomizedRegionSizes = computed(() => {
    const accepted = this.experimentReport()?.metadata.nucleotideDistributionAccepted;
    if (!accepted) return [];

    // Flatten all keys across size maps
    return Object.values(accepted).flatMap(sizeMap => Object.keys(sizeMap).map(Number));
  });

  readonly baseDistributionPercentages = computed(() => {
    const report = this.experimentReport();
    if (!report) return null;

    const cycleName = report.selectionCycleResponse.name;
    const acceptedByCycle = report.metadata.nucleotideDistributionAccepted[cycleName];
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
  });
  readonly sequencingForm = form(this.sequencingFormModel, (p) => {
    required(p.axisUnit);
    required(p.axisScale);
    required(p.selectedRegionSize);
  });

  /* Charts */
  readonly forwardReadsNucleotideDistributionRawChartOptions = this.chartService.getForwardReadsNucleotideDistributionRawChart(this.experimentReport, linkedSignal(() => this.sequencingForm.axisUnit().value() == 'percentage'));
  readonly reverseReadsNucleotideDistributionRawChartOptions = this.chartService.getReverseReadsNucleotideDistributionRawChart(this.experimentReport, linkedSignal(() => this.sequencingForm.axisUnit().value() == 'percentage'));
  readonly acceptedReadsNucleotideDistributionChartOptions = this.chartService.getAcceptedReadNucleotideDistributionChart(this.experimentReport, linkedSignal(() => this.sequencingForm.axisUnit().value() == 'percentage'), this.sequencingForm.selectedRegionSize().value);

  constructor() {
    effect(() => {
      const sizes = this.randomizedRegionSizes();
      if (!sizes) return;

      if (sizes.length > 0 && this.sequencingForm.selectedRegionSize().value() === 0) {
        this.sequencingForm.selectedRegionSize().value.set(sizes[0]);
      }
    });
  }
}
