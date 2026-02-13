import {ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgxEchartsDirective } from 'ngx-echarts';
import {FormField, form, min, required} from '@angular/forms/signals';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {ExperimentReport} from '../../models/experiment-report';
import {ExperimentChartService} from '../../services/experiment-chart.service';
import {PredictionsApiService} from '../../services/predictions-api.service';
import {FornacVisualizationComponent} from '../shared/fornac-visualization/fornac-visualization.component';

@Component({
  selector: 'app-aptamer-pool-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatRadioModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatExpansionModule,
    NgxEchartsDirective,
    FormField,
    MatSlideToggle,
    FornacVisualizationComponent
  ],
  templateUrl: './aptamer-pool-tab.component.html',
  styleUrl: './aptamer-pool-tab.component.scss',
})
export class AptamerPoolTabComponent {
  /* Input */
  readonly experimentReport = input.required<ExperimentReport>();

  /* Services */
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
  // 1. Table Definition & State Signals
  /* Top Header Row (Groups): ID, Sequence + 1 Group per Cycle */
  readonly groupedColumns = computed(() => {
    const cycleGroups = this.experimentReport().selectionCycleResponse
      .slice()
      .sort((a, b) => b.round - a.round)
      .map(cycle => `cycle-${cycle.round}-group`);
    return ['id', 'sequence', ...cycleGroups];
  });
  /* Sub-Header Row: Columns per Cycle (Count & Frequency) */
  readonly subcolumns = computed(() => {
    return this.experimentReport().selectionCycleResponse
      .slice()
      .sort((a, b) => b.round - a.round)
      .flatMap(cycle => [
        `cycle-${cycle.round}-count`,
        `cycle-${cycle.round}-frequency`
      ]);
  });
  /* Data Rows: ID, Sequence + All flattened cycle subcolumns */
  readonly dataColumns = computed(() => {
    return ['id', 'sequence', ...this.subcolumns()];
  });
  readonly pageIndex = signal(0);
  readonly sortState = signal<Sort>({ active: 'id', direction: 'asc' });
  // 2. All Data Signal
  private readonly totalAptamerData = linkedSignal<AptamerRow[]>(() => {
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
  // 3. Pipeline: Filtering (Search)
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
  // 4. Pipeline: Sorting
  readonly sortedData = linkedSignal(() => {
    const data = this.filteredData();
    const { active, direction } = this.sortState();

    if (!active || direction === '') return data;

    const multiplier = direction === 'asc' ? 1 : -1;
    return [...data].sort((a: AptamerRow, b: AptamerRow) => {
      // Static Columns
      if (active === 'id') {
        return (a.id - b.id) * multiplier;
      }
      else if (active === 'sequence') {
        return a.sequence.localeCompare(b.sequence) * multiplier;
      }
      // Dynamic Cycle Columns
      const match = active.match(/^cycle-(\d+)-(count|frequency)$/);
      if (match) {
        const round = Number(match[1]);
        const metric = match[2];

        if (metric === 'count') {
          const aValue = this.poolForm.useCPM().value() ? a.cycles[round].cpm : a.cycles[round].count;
          const bValue = this.poolForm.useCPM().value() ? b.cycles[round].cpm : b.cycles[round].count;
          return (aValue - bValue) * multiplier;
        } else if (metric === 'frequency') {
          return (a.cycles[round].frequency - b.cycles[round].frequency) * multiplier;
        }
      }

      return 0;
    });
  });
  // 5. Pipeline: Pagination (Final View Source)
  readonly paginatedData = linkedSignal(() => {
    const data = this.sortedData();
    const pageIndex = this.pageIndex();
    const pageSize = this.poolForm.itemsPerPage().value();

    const startIndex = pageIndex * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  });

  // 6. Event Handlers
  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
  }

  onSortChange(event: Sort) {
    this.sortState.set(event);
  }

  // Selection & Details
  readonly selectedSequence = signal<string | null>(null);

  readonly mfeResource = this.predictionsApiService.getMfe(this.selectedSequence);
  readonly basePairProbabilityMatrixHeatmapChartOptions = this.chartService.getBasePairProbabilityMatrixHeatmapChart(this.selectedSequence);
  readonly contextProbabilitySequenceLogoChartOptions = this.chartService.getContextProbabilitySequenceLogoChart(this.selectedSequence);

  resetSearch() {
    this.poolForm.query().value.set('');
    this.poolForm.searchIds().value.set(false);
    this.pageIndex.set(0);
  }

  onSelectRow(row: AptamerRow | null) {
    this.selectedSequence.set(row?.sequence ?? null);
  }
}

type SelectionCycleMetrics = {
  count: number;
  cpm: number;
  frequency: number;
};

type AptamerRow = {
  id: number;
  sequence: string;
  bounds: {
    startIndex: number;
    endIndex: number
  };
  cycles: Record<number, SelectionCycleMetrics>;
};
