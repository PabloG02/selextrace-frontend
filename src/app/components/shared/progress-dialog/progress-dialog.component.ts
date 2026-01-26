import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

export interface ProgressDialogData {
  title?: string;
}

@Component({
  selector: 'app-progress-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './progress-dialog.component.html',
  styleUrl: './progress-dialog.component.scss',
})
export class ProgressDialogComponent {
  protected readonly data = inject<ProgressDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ProgressDialogComponent>);

  readonly logs = signal<string[]>([]);
  readonly completed = signal(false);

  appendLog(entry: string, markComplete = false): void {
    this.logs.update((items) => [...items, entry]);
    if (markComplete) {
      this.completed.set(true);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
