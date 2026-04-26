import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ProjectSummary } from '../../../models/project';
import {ExperimentsApiService} from '../../../services/experiments-api.service';
import {MatSnackBar} from '@angular/material/snack-bar';

export interface MoveExperimentDialogData {
  experimentId: string;
  experimentName: string;
  currentProjectId: string | null;
  projects: ProjectSummary[];
}

@Component({
  selector: 'app-move-experiment-dialog',
  imports: [MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './move-experiment-dialog.component.html',
  styleUrl: './move-experiment-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveExperimentDialogComponent {
  protected readonly data = inject<MoveExperimentDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<MoveExperimentDialogComponent, boolean | null>);
  private readonly apiService = inject(ExperimentsApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSaving = signal(false);
  readonly selectedProjectId = signal<string | null>(this.data.currentProjectId);

  readonly canMove = computed(() => {
    const selectedProjectId = this.selectedProjectId();
    return !!selectedProjectId && selectedProjectId !== this.data.currentProjectId;
  });

  projectLabel(project: ProjectSummary): string {
    return project.personalProject ? `${project.name} (Personal workspace)` : project.name;
  }

  close(): void {
    this.dialogRef.close(null);
  }

  confirmMove(): void {
    const targetProjectId = this.selectedProjectId();
    if (!this.canMove() || !targetProjectId) return;

    this.isSaving.set(true);

    this.apiService.transferExperimentToProject(this.data.experimentId, targetProjectId).subscribe({
      next: () => {
        this.snackBar.open('Experiment moved successfully.', 'Dismiss', { duration: 2500 });
        this.dialogRef.close(true); // Tell the caller that the move succeeded
      },
      error: (error) => {
        this.isSaving.set(false);
        const message = error?.error?.message ?? 'Unable to move experiment to the selected project.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }
}
