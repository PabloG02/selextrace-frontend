import {ChangeDetectionStrategy, Component, inject, input, linkedSignal, signal} from '@angular/core';
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
    sortBy: 'enrichment',
    onCycle: null as string | null,
    query: '',
    searchIds: false,
  });
  readonly poolForm = form(this.poolFormModel, (p) => {
    required(p.itemsPerPage);
    min(p.itemsPerPage, 1);
    required(p.sortBy);
  });

  /* Table */
  // 1. All Data Signal
  private readonly totalAptamerData = linkedSignal<AptamerRow[]>(() => {
    const { idToAptamer, idToBounds, selectionCycleResponse } = this.experimentReport();
    return Object.entries(idToAptamer).map(([id, sequence]) => ({
      id: Number(id),
      sequence,
      bounds: idToBounds[Number(id)],
      count: selectionCycleResponse.counts[Number(id)],
      cpm: selectionCycleResponse.counts[Number(id)] / selectionCycleResponse.totalSize * 1_000_000,
      frequency: selectionCycleResponse.counts[Number(id)] / selectionCycleResponse.totalSize
    }));
  });
  // 2. Table State Signals
  readonly pageIndex = signal(0);
  readonly sortState = signal<Sort>({ active: 'count', direction: 'desc' });
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
    return [...data].sort((a: any, b: any) => {
      switch (active) {
        case 'id':
          return (a.id - b.id) * multiplier;
        case 'count':
          const aValue = this.poolForm.useCPM().value() ? a.cpm : a.count;
          const bValue = this.poolForm.useCPM().value() ? b.cpm : b.count;
          return (aValue - bValue) * multiplier;
        case 'frequency':
          return (a.frequency - b.frequency) * multiplier;
        default:
          return 0;
      }
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

type AptamerRow = {
  id: number;
  sequence: string;
  bounds: { startIndex: number; endIndex: number };
  count: number;
  cpm: number;
  frequency: number;
};
