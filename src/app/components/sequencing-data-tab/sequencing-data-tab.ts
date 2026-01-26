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
    MatOption
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
