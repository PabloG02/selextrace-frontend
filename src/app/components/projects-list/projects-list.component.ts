import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DatePipe } from '@angular/common';
import { filter, switchMap } from 'rxjs/operators';
import { ProjectsApiService } from '../../services/projects-api.service';
import { AuthService } from '../../services/auth.service';
import { ProjectCreateDialogComponent, ProjectCreateDialogResult } from './project-create-dialog/project-create-dialog.component';
import {ProjectStore} from '../../stores/project.store';

@Component({
  selector: 'app-projects-list',
  imports: [
    RouterLink,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './projects-list.component.html',
  styleUrl: './projects-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsListComponent {
  private readonly projectsApi = inject(ProjectsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);
  readonly router = inject(Router);
  readonly projectStore = inject(ProjectStore);

  openCreateDialog(): void {
    this.dialog
      .open(ProjectCreateDialogComponent, {
        width: '560px',
        maxWidth: '95vw',
        autoFocus: false,
      })
      .afterClosed()
      .pipe(
        filter((result): result is ProjectCreateDialogResult => result !== null),
        switchMap((payload) => this.projectsApi.createProject(payload)),
      )
      .subscribe({
        next: (project) => {
          this.projectStore.reloadProjects();
          this.router.navigate(['/projects', project.id]);
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Unable to create the project.';
          this.snackBar.open(message, 'Dismiss', { duration: 3500 });
        },
      });
  }
}
