import {ChangeDetectionStrategy, Component, computed, input, model, signal} from '@angular/core';
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
  readonly enableSelection = input<boolean>(true);
  readonly selectedRows = model<AptamerTableRow[]>([]);

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

    let sortKey: 'id' | 'sequence' | 'count' | 'frequency' | null = null;
    let round: number | null = null;

    if (active === 'id' || active === 'sequence') {
      sortKey = active;
    } else {
      const match = active.match(/^cycle-(\d+)-(count|frequency)$/);
      if (match) {
        round = Number(match[1]);
        sortKey = match[2] as 'count' | 'frequency';
      }
    }

    const multiplier = direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      switch (sortKey) {
        // Static Columns
        case 'id':
          return (a.id - b.id) * multiplier;
        case 'sequence':
          return a.sequence.localeCompare(b.sequence) * multiplier;
        // Dynamic Cycle Columns
        case 'count':
          const aValue = this.useCPM() ? a.cycles[round!].cpm : a.cycles[round!].count;
          const bValue = this.useCPM() ? b.cycles[round!].cpm : b.cycles[round!].count;
          return (aValue - bValue) * multiplier;
        case 'frequency':
          return (a.cycles[round!].frequency - b.cycles[round!].frequency) * multiplier;

        default:
          return 0;
      }
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
    const selectedRows = this.selectedRows();
    const selectedIndex = selectedRows.findIndex(item => item.id === row.id);
    const nextSelection = selectedIndex >= 0
      ? selectedRows.filter(item => item.id !== row.id)
      : [...selectedRows, row];
    nextSelection.sort((a, b) => a.id - b.id);
    this.selectedRows.set(nextSelection);
  }

  readonly selectedRowIds = computed(() => {
    return new Set(this.selectedRows().map(row => row.id));
  });

  isRowSelected(row: AptamerTableRow) {
    return this.selectedRowIds().has(row.id);
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
