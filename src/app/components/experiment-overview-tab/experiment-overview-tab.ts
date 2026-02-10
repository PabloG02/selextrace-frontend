import {Component, computed, inject, input, Signal, signal} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from "@angular/material/card";
import {MatDivider} from "@angular/material/list";
import {MatFormField, MatInput, MatLabel} from "@angular/material/input";
import {MatRadioButton, MatRadioGroup} from "@angular/material/radio";
import {NgxEchartsDirective} from "ngx-echarts";
import {ExperimentChartService} from '../../services/experiment-chart.service';
import {ExperimentReport} from '../../models/experiment-report';
import {FormField, form, max, min, required} from '@angular/forms/signals';

@Component({
  selector: 'app-experiment-overview-tab',
  imports: [
    MatButton,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardTitle,
    MatDivider,
    MatFormField,
    MatInput,
    MatLabel,
    MatRadioButton,
    MatRadioGroup,
    NgxEchartsDirective,
    FormField
  ],
  templateUrl: './experiment-overview-tab.html',
  styleUrl: './experiment-overview-tab.scss'
})
export class ExperimentOverviewTab {
  /* Services */
  private readonly chartService = inject(ExperimentChartService);
  /* Inputs */
  readonly experimentReport = input.required<ExperimentReport>();
  /* State */
  readonly experimentFormModel = signal({
    // Randomize Region Size Distribution
    axisUnit: 'count' as 'count' | 'percentage',
    axisScale: 'linear' as 'linear' | 'logarithmic',
    // Selection Cycle Composition
    singletonCutoff: 1,
  });
  readonly experimentForm = form(this.experimentFormModel, (p) => {
    required(p.singletonCutoff);
    min(p.singletonCutoff, 1);
    max(p.singletonCutoff, 100_000_000);
  });

  /* Charts */
  readonly randomizedRegionSizeDistributionChartOptions = this.chartService.getRandomizedRegionSizeDistributionChart(
    this.experimentReport,
    this.experimentForm.axisUnit().value,
    this.experimentForm.axisScale().value
  );
  readonly positiveSelectionCyclesChartOptions = this.chartService.getPositiveSelectionCyclesChart(this.experimentReport, this.experimentForm.singletonCutoff().value);

  /* Computed */
  readonly selectionCyclePercentagesEntries = computed(() =>
    Object.entries(this.experimentReport().experimentDetails.selectionCyclePercentages ?? {})
  );
}
