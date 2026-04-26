import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../services/theme.service';
import {NgOptimizedImage} from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  imports: [MatIconModule, RouterLink, NgOptimizedImage],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingComponent {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);

  readonly primaryRoute = computed(() =>
    this.authService.isAuthenticated()
      ? (this.authService.canCreateExperiments() ? '/experiments/new' : '/experiments')
      : '/signup',
  );

  readonly primaryLabel = computed(() =>
    this.authService.isAuthenticated()
      ? (this.authService.canCreateExperiments() ? 'New Experiment' : 'Open Workspace')
      : 'Create Account',
  );

  readonly secondaryRoute = computed(() => (this.authService.isAuthenticated() ? '/experiments' : '/login'));
  readonly secondaryLabel = computed(() => (this.authService.isAuthenticated() ? 'Browse Experiments' : 'Sign In'));

  readonly barHeights = [40, 70, 40, 90, 60, 30, 80];

  readonly isLightTheme = computed(() => {
    const theme = this.themeService.theme();

    if (theme === 'light') {
      return true;
    }

    if (theme === 'dark') {
      return false;
    }

    return this.prefersLightScheme();
  });

  private prefersLightScheme(): boolean {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: light)').matches;
  }
}
