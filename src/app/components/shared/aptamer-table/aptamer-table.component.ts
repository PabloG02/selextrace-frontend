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
  /** Terms to highlight in the randomized region (case-insensitive, literal match). */
  readonly searchTerms = input<string[]>([]);
  readonly pageSize = input<number>(10);
  readonly enableSelection = input<boolean>(true);
  readonly selectedRows = model<AptamerTableRow[]>([]);

  // Table Definition & State Signals
  readonly pageIndex = signal(0);
  readonly sortState = signal<Sort>({ active: 'id', direction: 'asc' });

  readonly sortedCyclesDesc = computed(() =>
    [...this.selectionCycles()].sort((a, b) => b.round - a.round)
  );

  /* Top Header Row (Groups): ID, Sequence + 1 Group per Cycle */
  readonly groupedColumns = computed(() => {
    const cycleGroups = this.sortedCyclesDesc()
      .map(cycle => `cycle-${cycle.round}-group`);
    return ['id', 'sequence', ...cycleGroups];
  });

  /* Sub-Header Row: Columns per Cycle (Count, Frequency & Enrichment) */
  readonly subcolumns = computed(() => {
    return this.sortedCyclesDesc()
      .flatMap((cycle, index, array) => {
        const columns = [
          `cycle-${cycle.round}-count`,
          `cycle-${cycle.round}-frequency`
        ];

        if (index !== array.length - 1) {
          columns.push(`cycle-${cycle.round}-enrichment`);
        }

        return columns;
      });
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

    let sortKey: 'id' | 'sequence' | 'count' | 'frequency' | 'enrichment' | null = null;
    let round: number | null = null;

    if (active === 'id' || active === 'sequence') {
      sortKey = active;
    } else {
      const match = active.match(/^cycle-(\d+)-(count|frequency|enrichment)$/);
      if (match) {
        round = Number(match[1]);
        sortKey = match[2] as 'count' | 'frequency' | 'enrichment';
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
        case 'enrichment':
          return this.compareNullableNumbers(
            a.cycles[round!]?.enrichment,
            b.cycles[round!]?.enrichment,
            multiplier
          );

        default:
          return 0;
      }
    });
  });

  private compareNullableNumbers(a: number | null, b: number | null, multiplier: number) {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;

    return (a - b) * multiplier;
  }

  // Pipeline: Pagination (Final View Source)
  readonly paginatedData = computed(() => {
    const data = this.sortedData();
    const pageIndex = this.pageIndex();
    const pageSize = this.pageSize();

    const startIndex = pageIndex * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  });

  /** Tokenized randomized region per visible row, with match flags for rendering. */
  readonly randomizedTokens = computed(() => {
    const tokens = new Map<number, SequenceToken[]>();
    const terms = this.searchTerms();
    for (const row of this.paginatedData()) {
      tokens.set(row.id, this.buildRandomizedTokens(row, terms));
    }
    return tokens;
  });

  /** Lookup precomputed randomized-region tokens for the provided row. */
  getRandomizedTokens(row: AptamerTableRow) {
    return this.randomizedTokens().get(row.id) ?? [];
  }

  /** Build per-base tokens for the randomized region with match flags. */
  private buildRandomizedTokens(row: AptamerTableRow, terms: string[]) {
    const {startIndex, endIndex} = row.bounds;
    const matches = this.buildMatchSet(row.sequence, row.bounds, terms);

    const tokens: SequenceToken[] = [];
    for (let index = startIndex; index < endIndex; index += 1) {
      const base = row.sequence.charAt(index);
      tokens.push({
        base,
        isMatch: matches.has(index),
      });
    }
    return tokens;
  }

  /** Compute matching indices for all terms within the randomized region. */
  private buildMatchSet(sequence: string, bounds: AptamerTableRow['bounds'], terms: string[]) {
    const matches = new Set<number>();
    if (terms.length === 0) {
      return matches;
    }

    const region = sequence.slice(bounds.startIndex, bounds.endIndex);

    for (const term of terms) {
      let index = region.indexOf(term);
      while (index !== -1) {
        for (let offset = 0; offset < term.length; offset++) {
          matches.add(bounds.startIndex + index + offset);
        }
        index = region.indexOf(term, index + 1);
      }
    }

    return matches;
  }

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
  enrichment: number | null;
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

/** Single-base render token for the randomized region. */
type SequenceToken = {
  base: string;
  isMatch: boolean;
};
