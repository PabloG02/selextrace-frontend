import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule, PageEvent} from '@angular/material/paginator';
import {MatSortModule, Sort} from '@angular/material/sort';

@Component({
  selector: 'app-aptamer-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: './aptamer-table.component.html',
  styleUrl: './aptamer-table.component.scss',
})
export class AptamerTableComponent {
  readonly rows = input.required<AptamerTableRow[]>();
  readonly selectionCycles = input.required<SelectionCycleSummary[]>();
  readonly showPrimers = input<boolean>(true);
  readonly useCPM = input<boolean>(true);
  readonly pageSize = input<number>(10);
  readonly selectedSequence = input<string | null>(null);
  readonly enableSelection = input<boolean>(true);

  readonly rowSelected = output<AptamerTableRow | null>();

  // Table Definition & State Signals
  readonly pageIndex = signal(0);
  readonly sortState = signal<Sort>({ active: 'id', direction: 'asc' });

  /* Top Header Row (Groups): ID, Sequence + 1 Group per Cycle */
  readonly groupedColumns = computed(() => {
    const cycleGroups = this.selectionCycles()
      .slice()
      .sort((a, b) => b.round - a.round)
      .map(cycle => `cycle-${cycle.round}-group`);
    return ['id', 'sequence', ...cycleGroups];
  });

  /* Sub-Header Row: Columns per Cycle (Count & Frequency) */
  readonly subcolumns = computed(() => {
    return this.selectionCycles()
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

  // Pipeline: Sorting
  readonly sortedData = computed(() => {
    const data = this.rows();
    const { active, direction } = this.sortState();

    if (!active || direction === '') return data;

    const multiplier = direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      // Static Columns
      if (active === 'id') return (a.id - b.id) * multiplier;
      if (active === 'sequence') return a.sequence.localeCompare(b.sequence) * multiplier;

      // Dynamic Cycle Columns
      const match = active.match(/^cycle-(\d+)-(count|frequency)$/);
      if (match) {
        const round = Number(match[1]);
        const metric = match[2];
        const aCycle = a.cycles[round];
        const bCycle = b.cycles[round];

        if (metric === 'count') {
          const aValue = this.useCPM() ? aCycle.cpm : aCycle.count;
          const bValue = this.useCPM() ? bCycle.cpm : bCycle.count;
          return (aValue - bValue) * multiplier;
        } else if (metric === 'frequency') {
          return (aCycle.frequency - bCycle.frequency) * multiplier;
        }
      }

      return 0;
    });
  });

  // Pipeline: Pagination (Final View Source)
  readonly paginatedData = computed(() => {
    const data = this.sortedData();
    const pageIndex = this.pageIndex();
    const pageSize = this.pageSize();

    const startIndex = pageIndex * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  });

  // Event Handlers
  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
  }

  onSortChange(event: Sort) {
    this.sortState.set(event);
  }

  onSelectRow(row: AptamerTableRow) {
    if (!this.enableSelection()) return;
    this.rowSelected.emit(row);
  }
}

export type SelectionCycleSummary = {
  round: number;
  name: string;
};

export type SelectionCycleMetrics = {
  count: number;
  cpm: number;
  frequency: number;
};

export type AptamerTableRow = {
  id: number;
  sequence: string;
  bounds: {
    startIndex: number;
    endIndex: number;
  };
  cycles: Record<number, SelectionCycleMetrics>;
};
