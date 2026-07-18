import {ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { ProjectsApiService } from '../../services/projects-api.service';
import { ProjectDetail } from '../../models/project';
import { ResourceAccessLevel } from '../../models/auth';
import {email, form, FormField, FormRoot, required} from '@angular/forms/signals';
import {firstValueFrom} from 'rxjs';
import {filter} from 'rxjs/operators';
import {MatTooltip} from '@angular/material/tooltip';
import {ProjectStore} from '../../stores/project.store';
import {ConfirmDialogComponent} from '../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-project-detail',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    FormRoot,
    FormField,
    MatTooltip,
  ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent {
private readonly projectsApi = inject(ProjectsApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly projectStore = inject(ProjectStore);
  private readonly dialog = inject(MatDialog);

  readonly projectId = input.required<number>();
  readonly projectRes = this.projectsApi.getProjectRes(this.projectId);
  readonly busyMemberIds = signal<Set<string>>(new Set());
  readonly accessLevels: ResourceAccessLevel[] = ['VIEWER', 'MANAGER'];

  readonly projectFormModel = linkedSignal(() => ({
    name: this.projectRes.value()?.name ?? '',
    description: this.projectRes.value()?.description ?? '',
  }));
  readonly projectForm = form(
    this.projectFormModel,
    (schemaPath) => {
      required(schemaPath.name, { message: 'Project name is required.' });
    },
    {
      submission: {
        action: async (field) => {
          try {
            await firstValueFrom(this.projectsApi.updateProject(this.projectId(), field().value()));
            this.projectRes.reload();
          } catch (error: any) {
            const message = error?.error?.message ?? 'Unable to update the project.';
            this.snackBar.open(message, 'Dismiss', { duration: 3500 });
          }
        },
      }
    }
  );

  readonly memberFormModel = signal({
    email: '',
    accessLevel: 'VIEWER' as ResourceAccessLevel,
  });
  readonly memberForm = form(
    this.memberFormModel,
    (schemaPath) => {
      required(schemaPath.email, { message: 'Email is required.' });
      email(schemaPath.email, { message: 'A valid email is required.' });
    },
    {
      submission: {
        action: async (field) => {
          try {
            await firstValueFrom(this.projectsApi.upsertMembership(this.projectId(), field().value()));
            this.projectRes.reload();
            this.memberFormModel.set({ email: '', accessLevel: 'VIEWER' });
          } catch (error: any) {
            const message = error.status === 404
              ? 'The user does not exist.'
              : (error?.error?.message ?? 'Unable to update project membership.');
            this.snackBar.open(message, 'Dismiss', { duration: 3500 });
          }
        },
      }
    }
  );

  updateMemberAccess(userId: string, accessLevel: ResourceAccessLevel): void {
    if (this.isMemberBusy(userId)) {
      return;
    }

    const currentMembership = this.projectRes.value()?.memberships.find((membership) => membership.userId === userId);
    if (!currentMembership || currentMembership.accessLevel === accessLevel) {
      return;
    }

    this.setMemberBusy(userId, true);
    this.projectsApi.upsertMembership(this.projectId(), { userId, accessLevel }).subscribe({
      next: () => {
        this.projectRes.reload();
        this.setMemberBusy(userId, false);
      },
      error: (error) => {
        this.setMemberBusy(userId, false);
        const message = error?.error?.message ?? 'Unable to update member access.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }

  isMemberBusy(userId: string): boolean {
    return this.busyMemberIds().has(userId);
  }

  removeMember(userId: string): void {
    if (this.isMemberBusy(userId)) {
      return;
    }

    this.setMemberBusy(userId, true);
    this.projectsApi.removeMembership(this.projectId(), userId).subscribe({
      next: () => {
        this.setMemberBusy(userId, false);
        this.projectRes.reload();
      },
      error: (error) => {
        this.setMemberBusy(userId, false);
        const message = error?.error?.message ?? 'Unable to remove this member.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }

deleteProject(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete Project',
          message: 'Delete this project? This is only possible when it contains no experiments.',
          confirmLabel: 'Delete',
          variant: 'warning',
        },
        autoFocus: false,
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe({
        next: () => {
          this.projectsApi.deleteProject(this.projectId()).subscribe({
            next: () => {
              this.projectStore.reloadProjects();
              this.router.navigate(['/projects']);
            },
            error: (error) => {
              const message = error?.error?.message ?? 'Unable to delete the project.';
              this.snackBar.open(message, 'Dismiss', { duration: 3500 });
            },
          });
        },
      });
  }

  canManageMembers(project: ProjectDetail): boolean {
    return project.accessLevel === 'MANAGER';
  }

  private setMemberBusy(userId: string, isBusy: boolean): void {
    this.busyMemberIds.update((current) => {
      const next = new Set(current);
      if (isBusy) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }
}
