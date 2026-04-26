import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import {ProjectsApiService} from '../../../services/projects-api.service';
import {MatSnackBar} from '@angular/material/snack-bar';
import {ProjectDetail} from '../../../models/project';

export interface ProjectCreateDialogResult {
  name: string;
  description: string;
}

@Component({
  selector: 'app-project-create-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './project-create-dialog.component.html',
  styleUrl: './project-create-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCreateDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ProjectCreateDialogComponent, ProjectDetail | null>);
  private readonly fb = inject(FormBuilder);
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isSaving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.nonNullable.control(''),
  });

  close(): void {
    this.dialogRef.close(null);
  }

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    this.form.disable();

    const value = this.form.getRawValue();
    const payload = {
      name: value.name.trim(),
      description: value.description.trim(),
    };

    this.projectsApi.createProject(payload).subscribe({
      next: (project) => {
        this.dialogRef.close(project);
      },
      error: (error) => {
        this.isSaving.set(false);
        this.form.enable();

        const message = error?.error?.message ?? 'Unable to create the project.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }
}
