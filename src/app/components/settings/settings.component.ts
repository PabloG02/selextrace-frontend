import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
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
  ],
  templateUrl: 'settings.component.html',
  styleUrl: 'settings.component.scss',
})
export class SettingsComponent {
  private themeService = inject(ThemeService);
  private backendConfigService = inject(BackendConfigService);
  
  currentTheme = this.themeService.theme;
  backendUrl = signal(this.backendConfigService.backendUrl());
  isBackendUrlModified = signal(false);

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
}
