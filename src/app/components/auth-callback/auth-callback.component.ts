import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth-callback',
  imports: [MatProgressSpinnerModule],
  template: `
    <main class="auth-callback">
      <mat-spinner diameter="40" />
    </main>
  `,
  styles: [`
    .auth-callback {
      min-height: 100vh;
      display: grid;
      place-items: center;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  async ngOnInit(): Promise<void> {
    try {
      await firstValueFrom(this.authService.ensureCsrfToken());
      const user = await firstValueFrom(this.authService.refreshSession());
      await this.router.navigate([user ? '/experiments' : '/login']);
    } catch {
      await this.router.navigate(['/login'], { queryParams: { oauthError: 'google' } });
    }
  }
}
