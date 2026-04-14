import { Component, ChangeDetectionStrategy, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { NgOptimizedImage } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

interface NavLink {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    NgOptimizedImage,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);

  readonly navLinks = computed<NavLink[]>(() => {
    const links: NavLink[] = [
      { label: 'Experiments', icon: 'science', route: '/experiments', exact: true },
      { label: 'Projects', icon: 'folder_shared', route: '/projects' },
      { label: 'Settings', icon: 'settings', route: '/settings' },
    ];

    if (this.authService.isAdmin()) {
      links.splice(2, 0, { label: 'Admin', icon: 'admin_panel_settings', route: '/admin/users' });
    }

    return links;
  });

  readonly isMobileView = toSignal(
    this.breakpointObserver
      .observe('(max-width: 960px)')
      .pipe(map(result => result.matches)),
    { initialValue: false },
  );

  readonly drawerState = signal<'opened' | 'collapsed' | 'closed'>('opened');
  readonly navToggleIcon = computed(() => ({
    opened: 'menu_open',
    collapsed: 'menu',
    closed: 'menu_open',
  }[this.drawerState()]));
  readonly navToggleLabel = computed(() => ({
    opened: 'Collapse navigation menu',
    collapsed: 'Expand navigation menu',
    closed: 'Open navigation menu',
  }[this.drawerState()]));

  constructor() {
    effect(
      () => {
        const handset = this.isMobileView();
        this.drawerState.set(handset ? 'closed' : 'opened');
      },
      { allowSignalWrites: true },
    );
  }

  toggleDrawer(): void {
    this.drawerState.update((state) => {
      if (state === 'opened') {
        return this.isMobileView() ? 'closed' : 'collapsed';
      } else {
        return 'opened';
      }
    });
  }

  onDrawerClosed(): void {
    this.drawerState.set(this.isMobileView() ? 'closed' : 'collapsed');
  }

  onNavigate(): void {
    if (this.isMobileView()) {
      this.drawerState.set('closed');
    }
  }

  createExperiment(): void {
    if (!this.authService.canCreateExperiments()) {
      this.router.navigate(['/experiments']);
      return;
    }
    this.router.navigate(['/experiments', 'new']);
    this.onNavigate();
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
