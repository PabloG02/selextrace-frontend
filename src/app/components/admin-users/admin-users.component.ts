import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe } from '@angular/common';

import { AdminUsersApiService } from '../../services/admin-users-api.service';
import { SystemRole, UserSummary } from '../../models/auth';
import {
  ResetPasswordDialogComponent,
  ResetPasswordDialogData,
} from './reset-password-dialog/reset-password-dialog.component';

@Component({
  selector: 'app-admin-users',
  imports: [
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatSortModule,
    MatTableModule,
    MatTooltipModule,
    DatePipe,
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent {
  private readonly adminUsersApi = inject(AdminUsersApiService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  readonly roleOptions: Array<{ value: SystemRole; label: string }> = [
    { value: 'ADMIN', label: 'Admin' },
    { value: 'STANDARD', label: 'Regular user' },
  ];

  readonly usersRes = this.adminUsersApi.getUsersRes();

  readonly filterText = signal('');
  readonly sortState = signal<Sort>({ active: 'user', direction: 'asc' });
  readonly pageIndex = signal(0);
  readonly pageSize = signal(10);

  readonly filteredUsers = computed(() => {
    const filterValue = this.filterText().trim().toLowerCase();
    const users = this.usersRes.value() ?? [];
    if (!filterValue) {
      return users;
    }
    return users.filter((user) =>
      `${user.username} ${user.email}`.toLowerCase().includes(filterValue),
    );
  });

  readonly sortedUsers = computed(() => {
    const data = this.filteredUsers();
    const { active, direction } = this.sortState();
    if (!active || direction === '') {
      return data;
    }

    const multiplier = direction === 'asc' ? 1 : -1;
    return [...data].sort((left, right) => {
      switch (active) {
        case 'user':
          return left.username.localeCompare(right.username) * multiplier;
        case 'role':
          return left.systemRole.localeCompare(right.systemRole) * multiplier;
        case 'active':
          return (Number(left.active) - Number(right.active)) * multiplier;
        case 'createdAt': {
          const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0;
          const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0;
          return (leftDate - rightDate) * multiplier;
        }
        default:
          return 0;
      }
    });
  });

  readonly paginatedUsers = computed(() => {
    const data = this.sortedUsers();
    const startIndex = this.pageIndex() * this.pageSize();
    return data.slice(startIndex, startIndex + this.pageSize());
  });

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.filterText.set(filterValue);
    this.pageIndex.set(0);
  }

  onSortChange(event: Sort): void {
    this.sortState.set(event);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  userRole(systemRole: UserSummary['systemRole']): SystemRole {
    return systemRole;
  }

  updateRole(user: UserSummary, role: SystemRole | null): void {
    if (role === null) {
      return;
    }

    this.adminUsersApi.updateRole(user.id, role).subscribe({
      next: () => this.usersRes.reload(),
      error: () => this.snackBar.open('Unable to update user role.', 'Dismiss', { duration: 3500 }),
    });
  }

  updateActive(user: UserSummary, active: boolean): void {
    this.adminUsersApi.updateActive(user.id, active).subscribe({
      next: () => this.usersRes.reload(),
      error: () => this.snackBar.open('Unable to update user status.', 'Dismiss', { duration: 3500 }),
    });
  }

  resetPassword(user: UserSummary): void {
    const dialogRef = this.dialog.open<ResetPasswordDialogComponent, ResetPasswordDialogData, string>(
      ResetPasswordDialogComponent,
      {
        width: '400px',
        data: { userId: user.id, username: user.username },
      },
    );

    dialogRef.afterClosed().subscribe((tempPassword) => {
      if (tempPassword) {
        this.adminUsersApi.resetPassword(user.id, tempPassword).subscribe({
          next: () => {
            this.usersRes.reload();
            this.snackBar.open(
              'Temporary password set. The user must change it on next login.',
              'Dismiss',
              { duration: 4000 },
            );
          },
          error: (error) => {
            const message = error?.error?.message ?? 'Unable to reset the password.';
            this.snackBar.open(message, 'Dismiss', { duration: 3500 });
          },
        });
      }
    });
  }
}

