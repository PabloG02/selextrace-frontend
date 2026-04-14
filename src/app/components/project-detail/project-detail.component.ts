import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ProjectsApiService } from '../../services/projects-api.service';
import { ProjectDetail } from '../../models/project';
import { ResourceAccessLevel } from '../../models/auth';

@Component({
  selector: 'app-project-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly projectId = input.required<string>();
  readonly project = signal<ProjectDetail | null>(null);
  readonly isLoading = signal(true);
  readonly accessLevels: ResourceAccessLevel[] = ['VIEWER', 'MANAGER'];

  readonly projectForm = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.nonNullable.control(''),
  });

  readonly memberForm = this.fb.nonNullable.group({
    email: this.fb.nonNullable.control('', [Validators.required, Validators.email]),
    accessLevel: this.fb.nonNullable.control<ResourceAccessLevel>('VIEWER'),
  });

  constructor() {
    effect(() => {
      const id = this.projectId();
      this.loadProject(id);
    });
  }

  loadProject(projectId: string): void {
    this.isLoading.set(true);
    this.projectsApi.getProject(projectId).subscribe({
      next: (project) => {
        this.project.set(project);
        this.projectForm.reset({
          name: project.name,
          description: project.description ?? '',
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        const message = error?.error?.message ?? 'Unable to load the project.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }

  saveProject(): void {
    if (this.projectForm.invalid) {
      this.projectForm.markAllAsTouched();
      return;
    }
    this.projectsApi.updateProject(this.projectId(), this.projectForm.getRawValue()).subscribe({
      next: (project) => this.project.set(project),
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to update the project.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }

  addMember(): void {
    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return;
    }
    this.projectsApi.upsertMembership(this.projectId(), this.memberForm.getRawValue()).subscribe({
      next: (project) => {
        this.project.set(project);
        this.memberForm.reset({ email: '', accessLevel: 'VIEWER' });
      },
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to update project membership.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }

  removeMember(userId: string): void {
    this.projectsApi.removeMembership(this.projectId(), userId).subscribe({
      next: () => this.loadProject(this.projectId()),
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to remove this member.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }
}
