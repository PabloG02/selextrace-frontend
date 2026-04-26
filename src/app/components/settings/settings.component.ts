import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormField, FormRoot, form, minLength, required, validate } from '@angular/forms/signals';
import { AuthService } from '../../services/auth.service';
import { BackendConfigService } from '../../services/backend-config.service';
import { ThemeService, type Theme } from '../../services/theme.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    FormRoot,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatCardModule,
    MatDividerModule,
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
  userRoleLabel = this.authService.userRoleLabel;
  backendUrl = signal(this.backendConfigService.backendUrl());
  isBackendUrlModified = signal(false);
  passwordFormModel = signal({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  passwordForm = form(
    this.passwordFormModel,
    (schemaPath) => {
      required(schemaPath.currentPassword, { message: 'Current password is required.' });

      required(schemaPath.newPassword, { message: 'New password is required.' });
      minLength(schemaPath.newPassword, 10, { message: 'New password must be at least 10 characters.' });

      required(schemaPath.confirmPassword, { message: 'Please confirm your new password.' });
      validate(schemaPath.confirmPassword, ({ value, valueOf }) => {
        if (value() !== valueOf(schemaPath.newPassword)) {
          return {
            kind: 'passwordMismatch',
            message: 'Passwords do not match.',
          };
        }

        return null;
      });
    },
    {
      submission: {
        action: async (field) => {
          const { currentPassword, newPassword } = field().value();

          try {
            await firstValueFrom(this.authService.changePassword({ currentPassword, newPassword }));

            this.passwordFormModel.set({
              currentPassword: '',
              newPassword: '',
              confirmPassword: '',
            });
            this.snackBar.open('Password updated successfully.', 'Dismiss', { duration: 3000 });
            return;
          } catch (error: any) {
            const message = error?.error?.message ?? 'Unable to change your password.';
            this.snackBar.open(message, 'Dismiss', { duration: 3500 });

            return {
              kind: 'passwordChangeFailed',
              message,
              fieldTree: field,
            };
          }
        },
      },
    },
  );

  onThemeChange(theme: Theme): void {
    this.themeService.setTheme(theme);
  }

  onBackendUrlChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.backendUrl.set(input.value);
    this.isBackendUrlModified.set(input.value !== this.backendConfigService.backendUrl());
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

  passwordSubmissionError(): string | null {
    return this.passwordForm().errors().find((error) => error.kind === 'passwordChangeFailed')?.message ?? null;
  }
}
