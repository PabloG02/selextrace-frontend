import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { ProjectsApiService } from '../../services/projects-api.service';
import { ProjectSummary } from '../../models/project';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-projects-list',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: './projects-list.component.html',
  styleUrl: './projects-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsListComponent {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);

  readonly projects = signal<ProjectSummary[]>([]);
  readonly isLoading = signal(true);
  readonly isCreating = signal(false);
  readonly form = this.fb.nonNullable.group({
    name: this.fb.nonNullable.control('', [Validators.required]),
    description: this.fb.nonNullable.control(''),
  });

  constructor() {
    this.loadProjects();
  }

  loadProjects(): void {
    this.isLoading.set(true);
    this.projectsApi.listProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Unable to load projects.', 'Dismiss', { duration: 3500 });
      },
    });
  }

  createProject(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.projectsApi.createProject(this.form.getRawValue()).subscribe({
      next: (project) => {
        this.form.reset({ name: '', description: '' });
        this.loadProjects();
        this.router.navigate(['/projects', project.id]);
      },
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to create the project.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }
}
