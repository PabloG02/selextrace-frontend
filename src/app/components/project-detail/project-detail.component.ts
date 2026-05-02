import {ChangeDetectionStrategy, Component, computed, effect, inject, input, linkedSignal, signal} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { ProjectsApiService } from '../../services/projects-api.service';
import { ProjectDetail } from '../../models/project';
import { ResourceAccessLevel } from '../../models/auth';
import {email, form, FormField, FormRoot, required} from '@angular/forms/signals';
import {firstValueFrom} from 'rxjs';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-project-detail',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
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

  readonly projectId = input.required<string>();
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

  canManageMembers(project: ProjectDetail): boolean {
    return project.permissions.canManage && !project.personalProject;
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
