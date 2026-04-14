import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { BackendConfigService } from '../../services/backend-config.service';
import { ThemeService, type Theme } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
  ],
  templateUrl: 'settings.component.html',
  styleUrl: 'settings.component.scss',
})
export class SettingsComponent {
  private themeService = inject(ThemeService);
  private backendConfigService = inject(BackendConfigService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  currentTheme = this.themeService.theme;
  currentUser = this.authService.currentUser;
  backendUrl = signal(this.backendConfigService.backendUrl());
  isBackendUrlModified = signal(false);
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');

  onThemeChange(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  onBackendUrlInput(): void {
    this.isBackendUrlModified.set(
      this.backendUrl() !== this.backendConfigService.backendUrl()
    );
  }

  saveBackendUrl(): void {
    this.backendConfigService.setBackendUrl(this.backendUrl());
    this.isBackendUrlModified.set(false);
  }

  resetBackendUrl(): void {
    this.backendConfigService.resetToDefault();
    this.backendUrl.set(this.backendConfigService.backendUrl());
    this.isBackendUrlModified.set(false);
  }

  changePassword(): void {
    if (!this.currentPassword() || !this.newPassword()) {
      this.snackBar.open('Enter your current password and a new password.', 'Dismiss', { duration: 3000 });
      return;
    }

    if (this.newPassword() !== this.confirmPassword()) {
      this.snackBar.open('New password and confirmation must match.', 'Dismiss', { duration: 3000 });
      return;
    }

    this.authService.changePassword({
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
    }).subscribe({
      next: () => {
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.snackBar.open('Password updated successfully.', 'Dismiss', { duration: 3000 });
      },
      error: (error) => {
        const message = error?.error?.message ?? 'Unable to change your password.';
        this.snackBar.open(message, 'Dismiss', { duration: 3500 });
      },
    });
  }
}
