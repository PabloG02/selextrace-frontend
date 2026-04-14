import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingComponent {
  private readonly authService = inject(AuthService);

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
}
