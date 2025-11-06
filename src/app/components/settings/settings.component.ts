import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService, type Theme } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonToggleModule, MatIconModule],
  templateUrl: 'settings.component.html',
  styleUrl: 'settings.component.scss',
})
export class SettingsComponent {
  private themeService = inject(ThemeService);
  
  currentTheme = this.themeService.theme;

  onThemeChange(theme: Theme): void {
    this.themeService.setTheme(theme);
  }
}
