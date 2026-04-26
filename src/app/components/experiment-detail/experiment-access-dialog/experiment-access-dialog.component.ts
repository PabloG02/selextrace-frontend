import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, finalize } from 'rxjs/operators';
import { ResourceAccessLevel } from '../../../models/auth';
import { ExperimentAccessGrant } from '../../../models/project';
import { ExperimentsApiService } from '../../../services/experiments-api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import {MatDivider} from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import {MatTooltip} from '@angular/material/tooltip';

export interface ExperimentAccessDialogData {
  experimentId: string;
  experimentName: string;
}

@Component({
  selector: 'app-experiment-access-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    FormsModule,
    MatDivider,
    MatTableModule,
    MatTooltip,
  ],
  templateUrl: './experiment-access-dialog.component.html',
  styleUrl: './experiment-access-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperimentAccessDialogComponent {
  protected readonly data = inject<ExperimentAccessDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ExperimentAccessDialogComponent>);
  private readonly apiService = inject(ExperimentsApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly accessLevels: ResourceAccessLevel[] = ['VIEWER', 'MANAGER'];
  readonly grants = signal<ExperimentAccessGrant[]>([]);
  readonly isLoading = signal(true);

  readonly emailToAdd = signal('');
  readonly addAccessLevel = signal<ResourceAccessLevel>('VIEWER');
  readonly isAdding = signal(false);

  readonly busyUsers = signal<Set<string>>(new Set());

  constructor() {
    this.loadAccess();
  }

  close(): void {
    this.dialogRef.close();
  }

  isGrantBusy(userId: string): boolean {
    return this.busyUsers().has(userId);
  }

  addAccess(): void {
    const email = this.emailToAdd().trim();
    if (!email) {
      this.snackBar.open('Enter a user email to share this experiment.', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isAdding.set(true);
    this.apiService
      .upsertExperimentPermissions(this.data.experimentId, {
        email,
        accessLevel: this.addAccessLevel(),
      })
      .pipe(finalize(() => this.isAdding.set(false)))
      .subscribe({
        next: (grants) => {
          this.grants.set(grants);
          this.emailToAdd.set('');
          this.addAccessLevel.set('VIEWER');
          this.snackBar.open('Access granted.', 'Dismiss', { duration: 2500 });
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Unable to grant access.';
          this.snackBar.open(message, 'Dismiss', { duration: 3500 });
        },
      });
  }

  saveGrant(userId: string, accessLevel: ResourceAccessLevel): void {
    this.setUserBusy(userId, true);
    this.apiService
      .upsertExperimentPermissions(this.data.experimentId, { userId, accessLevel })
      .pipe(finalize(() => this.setUserBusy(userId, false)))
      .subscribe({
        next: (grants) => {
          this.grants.set(grants);
          this.snackBar.open('Access updated.', 'Dismiss', { duration: 2500 });
        },
        error: (error) => {
          const message = error?.error?.message ?? 'Unable to update access level.';
          this.snackBar.open(message, 'Dismiss', { duration: 3500 });
        },
      });
  }

  removeGrant(grant: ExperimentAccessGrant): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Remove access?',
          message: `This will remove ${grant.username} from the experiment access list.`,
          confirmLabel: 'Remove',
          variant: 'warning',
        },
        autoFocus: false,
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.setUserBusy(grant.userId, true);
        this.apiService
          .removeExperimentPermissions(this.data.experimentId, grant.userId)
          .pipe(finalize(() => this.setUserBusy(grant.userId, false)))
          .subscribe({
            next: () => {
              this.grants.update((current) => current.filter((item) => item.userId !== grant.userId));
              this.snackBar.open('Access removed.', 'Dismiss', { duration: 2500 });
            },
            error: (error) => {
              const message = error?.error?.message ?? 'Unable to remove access.';
              this.snackBar.open(message, 'Dismiss', { duration: 3500 });
            },
          });
      });
  }

  private loadAccess(): void {
    this.isLoading.set(true);
    this.apiService
      .listExperimentPermissions(this.data.experimentId)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe({
        next: (grants) => this.grants.set(grants),
        error: (error) => {
          const message = error?.error?.message ?? 'Unable to load access information.';
          this.snackBar.open(message, 'Dismiss', { duration: 3500 });
        },
      });
  }

  private setUserBusy(userId: string, busy: boolean): void {
    this.busyUsers.update((current) => {
      const next = new Set(current);
      if (busy) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  }
}
