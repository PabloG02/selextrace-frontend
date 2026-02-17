import {ChangeDetectionStrategy, Component, inject, input, linkedSignal, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgxEchartsDirective } from 'ngx-echarts';
import {FormField, form, min, required} from '@angular/forms/signals';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {ExperimentReport} from '../../models/experiment-report';
import {ExperimentChartService} from '../../services/experiment-chart.service';
import {PredictionsApiService} from '../../services/predictions-api.service';
import {FornacVisualizationComponent} from '../shared/fornac-visualization/fornac-visualization.component';
import {AptamerTableComponent, AptamerTableRow, SelectionCycleMetrics} from '../shared/aptamer-table/aptamer-table.component';
import {MatButtonToggle, MatButtonToggleGroup} from '@angular/material/button-toggle';
import {ThemeService} from '../../services/theme.service';

@Component({
  selector: 'app-aptamer-pool-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatExpansionModule,
    NgxEchartsDirective,
    FormField,
    MatSlideToggle,
    FornacVisualizationComponent,
    AptamerTableComponent,
    MatButtonToggleGroup,
    MatButtonToggle
  ],
  templateUrl: './aptamer-pool-tab.component.html',
  styleUrl: './aptamer-pool-tab.component.scss',
})
export class AptamerPoolTabComponent {
  /* Input */
  readonly experimentReport = input.required<ExperimentReport>();

  /* Services */
  readonly themeService = inject(ThemeService);
  private readonly chartService = inject(ExperimentChartService);
  private readonly predictionsApiService = inject(PredictionsApiService);

  /* Reactive Signal Form Model */
  readonly poolFormModel = signal({
    showPrimers: true,
    useCPM: true,
    itemsPerPage: 10,
    query: '',
    searchIds: false,
  });
  readonly poolForm = form(this.poolFormModel, (p) => {
    required(p.itemsPerPage);
    min(p.itemsPerPage, 1);
  });

  /* Table */
  // 1. All Data Signal
  private readonly totalAptamerData = linkedSignal<AptamerTableRow[]>(() => {
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
      };
    });
  });
  // 2. Pipeline: Filtering (Search)
  readonly filteredData = linkedSignal(() => {
    const data = this.totalAptamerData();
    const query = this.poolForm.query().value()?.trim().toLowerCase();
    const searchIds = this.poolForm.searchIds().value();

    if (!query) return data;

    if (searchIds) {
      // ID Search (comma separated)
      const ids = query.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
      return data.filter(row => ids.includes(row.id));
    } else {
      // Sequence Search
      return data.filter(row => row.sequence?.toLowerCase().includes(query));
    }
  });

  // Selection & Details
  readonly selectedSequence = signal<string | null>(null);

  readonly mfeResource = this.predictionsApiService.getMfe(this.selectedSequence);
  readonly basePairProbabilityMatrixHeatmapChartOptions = this.chartService.getBasePairProbabilityMatrixHeatmapChart(this.selectedSequence);
  readonly contextProbabilitySequenceLogoChartOptions = this.chartService.getContextProbabilitySequenceLogoChart(this.selectedSequence);

  resetSearch() {
    this.poolForm.query().value.set('');
    this.poolForm.searchIds().value.set(false);
  }

  onSelectRow(row: AptamerTableRow | null) {
    this.selectedSequence.set(row?.sequence ?? null);
  }
}
