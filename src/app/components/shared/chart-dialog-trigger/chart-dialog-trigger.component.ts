import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { EChartsOption } from 'echarts';
import { ChartViewerDialogComponent } from '../chart-viewer-dialog/chart-viewer-dialog.component';

@Component({
  selector: 'app-chart-dialog-trigger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <button
      matIconButton
      [disabled]="disabled()"
      [attr.aria-label]="resolvedAriaLabel()"
      (click)="openChartDialog()">
      <mat-icon>open_in_full</mat-icon>
    </button>
  `,
})
export class ChartDialogTriggerComponent {
  private readonly dialog = inject(MatDialog);

  readonly title = input.required<string>();
  readonly options = input.required<EChartsOption>();
  readonly exportFileName = input<string>();
  readonly disabled = input(false);
  readonly ariaLabel = input<string>();

  protected openChartDialog(): void {
    this.dialog.open(ChartViewerDialogComponent, {
      autoFocus: false,
      panelClass: 'chart-viewer-dialog-panel',
      width: 'min(92vw, 1120px)',
      height: 'min(85vh, 760px)',
      maxWidth: '96vw',
      maxHeight: '96vh',
      data: {
        title: this.title(),
        options: this.options(),
        exportFileName: this.exportFileName(),
      },
    });
  }

  protected resolvedAriaLabel(): string {
    return this.ariaLabel() ?? `Open ${this.title()} in a resizable dialog`;
  }
}
