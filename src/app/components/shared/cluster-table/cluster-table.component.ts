import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTableModule} from '@angular/material/table';
import {MatPaginatorModule, PageEvent} from '@angular/material/paginator';
import {MatSortModule, Sort} from '@angular/material/sort';

@Component({
  selector: 'app-cluster-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatSortModule],
  templateUrl: './cluster-table.component.html',
  styleUrl: './cluster-table.component.scss',
})
export class ClusterTableComponent {
  readonly rows = input.required<ClusterTableRow[]>();
  readonly selectedClusterId = input<number | null>(null);
  readonly pageSize = input<number>(15);
  readonly pageSizeOptions = input<number[]>([15, 25, 50, 100]);

  readonly clusterSelected = output<number>();

  // Table State Signals
  readonly pageIndex = signal(0);
  readonly pageSizeState = signal(this.pageSize());
  readonly sortState = signal<Sort>({ active: 'size', direction: 'desc' });

  // Pipeline: Sorting
  readonly sortedRows = computed(() => {
    const data = this.rows();
    const { active, direction } = this.sortState();

    if (!active || direction === '') return data;

    const multiplier = direction === 'asc' ? 1 : -1;
    return [...data].sort((a, b) => {
      if (active === 'id') return (a.clusterId - b.clusterId) * multiplier;
      if (active === 'size') return (a.size - b.size) * multiplier;
      if (active === 'diversity') return (a.diversity - b.diversity) * multiplier;
      return 0;
    });
  });

  // Pipeline: Pagination (Final View Source)
  readonly paginatedRows = computed(() => {
    const data = this.sortedRows();
    const pageIndex = this.pageIndex();
    const pageSize = this.pageSizeState();

    const startIndex = pageIndex * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  });

  // Event Handlers
  onPageChange(event: PageEvent) {
    this.pageIndex.set(event.pageIndex);
    this.pageSizeState.set(event.pageSize);
  }

  onSortChange(event: Sort) {
    this.sortState.set(event);
  }

  onSelectRow(row: ClusterTableRow) {
    this.clusterSelected.emit(row.clusterId);
  }
}

export type ClusterTableRow = {
  clusterId: number;
  aptamerIds: number[];
  diversity: number;
  size: number;
};
