import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AdminUsersApiService } from '../../services/admin-users-api.service';
import { SystemRole, UserSummary } from '../../models/auth';

@Component({
  selector: 'app-admin-users',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
  ],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersComponent {
  private readonly adminUsersApi = inject(AdminUsersApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly users = signal<UserSummary[]>([]);
  readonly isLoading = signal(true);
  readonly roleOptions: SystemRole[] = ['PLATFORM_ADMIN', 'EXPERIMENT_MANAGER', 'EXPERIMENT_VIEWER'];
  readonly tempPasswords = signal<Record<string, string>>({});

  constructor() {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading.set(true);
    this.adminUsersApi.listUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.snackBar.open('Unable to load users.', 'Dismiss', { duration: 3500 });
      },
    });
  }

  updateRole(user: UserSummary, role: SystemRole): void {
    this.adminUsersApi.updateRole(user.id, role).subscribe({
      next: (updatedUser) => this.replaceUser(updatedUser),
      error: () => this.snackBar.open('Unable to update user role.', 'Dismiss', { duration: 3500 }),
    });
  }

  updateActive(user: UserSummary, active: boolean): void {
    this.adminUsersApi.updateActive(user.id, active).subscribe({
      next: (updatedUser) => this.replaceUser(updatedUser),
      error: () => this.snackBar.open('Unable to update user status.', 'Dismiss', { duration: 3500 }),
    });
  }

  updateTempPassword(userId: string, value: string): void {
    this.tempPasswords.update((current) => ({ ...current, [userId]: value }));
  }

  resetPassword(user: UserSummary): void {
    const tempPassword = this.tempPasswords()[user.id]?.trim();
    if (!tempPassword) {
      this.snackBar.open('Enter a temporary password first.', 'Dismiss', { duration: 3000 });
      return;
    }

    this.adminUsersApi.resetPassword(user.id, tempPassword).subscribe({
      next: (updatedUser) => {
        this.replaceUser(updatedUser);
        this.updateTempPassword(user.id, '');
        this.snackBar.open('Temporary password set. The user must change it on next login.', 'Dismiss', { duration: 4000 });
      },
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to reset the password.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }

  private replaceUser(updatedUser: UserSummary): void {
    this.users.update((currentUsers) =>
      currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)),
    );
  }
}
