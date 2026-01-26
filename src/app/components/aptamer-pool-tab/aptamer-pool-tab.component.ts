import {ChangeDetectionStrategy, Component, effect, inject, input, linkedSignal, signal} from '@angular/core';
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
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatExpansionModule } from '@angular/material/expansion';
import { NgxEchartsDirective } from 'ngx-echarts';
import {Field, form, min, required} from '@angular/forms/signals';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {ExperimentReport} from '../../models/experiment-report';
import {ExperimentChartService} from '../../services/experiment-chart.service';

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
    Field,
    MatSlideToggle
  ],
  templateUrl: './aptamer-pool-tab.component.html',
  styleUrl: './aptamer-pool-tab.component.scss',
})
export class AptamerPoolTabComponent {
  /* Input */
  readonly experimentReport = input.required<ExperimentReport>();

  /* Services */
  private readonly chartService = inject(ExperimentChartService);

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

  // Table state
  readonly totalAptamerData = linkedSignal(() => {
    const record = this.experimentReport().idToAptamer;
    return Object.entries(record).map(([id, sequence]) => ({
      id: Number(id),
      sequence,
      count: 0, // or 0 if not applicable
      cpm: 0,   // optional
    }));
  });
  readonly totalItems = linkedSignal(() => this.totalAptamerData().length);
  readonly filteredAptamerData = linkedSignal(() => this.totalAptamerData().slice(0, this.poolForm.itemsPerPage().value()));
  readonly pageIndex = signal(0);

  // Selection & details
  readonly selectedSequence = signal<string | null>(null);

  readonly basePairProbabilityMatrixHeatmapChartOptions = this.chartService.getBasePairProbabilityMatrixHeatmapChart(this.selectedSequence);

  resetSearch() {
    this.poolForm.query().value.set('');
    this.poolForm.searchIds().value.set(false);
    this.pageIndex.set(0);
  }

  onSelectRow(row: any) {
    this.selectedSequence.set(row?.sequence ?? null);
  }

  protected readonly console = console;
}
