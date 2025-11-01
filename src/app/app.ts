import {Component, computed, effect, inject, signal} from '@angular/core';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {MatSidenavModule} from '@angular/material/sidenav';
import {MatToolbarModule} from '@angular/material/toolbar';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatListModule} from '@angular/material/list';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {NgOptimizedImage} from '@angular/common';
import {ExperimentsStore} from './stores/experiments.store';
import {BreakpointObserver} from '@angular/cdk/layout';
import {toSignal} from '@angular/core/rxjs-interop';
import {map} from 'rxjs/operators';

interface NavLink {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
}

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatListModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    NgOptimizedImage,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  // private readonly router = inject(Router);
  // private readonly experimentsStore = inject(ExperimentsStore);
  private readonly breakpointObserver = inject(BreakpointObserver);

  readonly navLinks: NavLink[] = [
    { label: 'Experiments', icon: 'science', route: '/experiments', exact: true },
    { label: 'Create New', icon: 'add_circle', route: '/experiments/new' },
    { label: 'Settings', icon: 'settings', route: '/settings' },
  ];

  /**
   * Reactive signal indicating whether the current viewport corresponds to a mobile layout.
   */
  readonly isMobileView = toSignal(
    this.breakpointObserver
      .observe('(max-width: 960px)')
      .pipe(map(result => result.matches)),
    { initialValue: false },
  );

  readonly drawerOpened = signal(true);

  // readonly searchTerm = computed(() => this.experimentsStore.globalSearchTerm());

  constructor() {
    effect(
      () => {
        const handset = this.isMobileView();
        this.drawerOpened.set(!handset);
      },
      { allowSignalWrites: true },
    );
  }

  toggleDrawer(): void {
    this.drawerOpened.update((opened) => !opened);
  }

  onDrawerClosed(): void {
    if (this.isMobileView()) {
      this.drawerOpened.set(false);
    }
  }

  onNavigate(): void {
    if (this.isMobileView()) {
      this.drawerOpened.set(false);
    }
  }

  // onSearchChange(value: string): void {
  //   this.experimentsStore.setGlobalSearchTerm(value);
  // }
  //
  // onSearchSubmit(): void {
  //   if (!this.router.url.startsWith('/experiments')) {
  //     this.router.navigate(['/experiments']);
  //   }
  // }
  //
  // clearSearch(): void {
  //   this.experimentsStore.clearGlobalSearch();
  //   if (this.isMobileView()) {
  //     // keep focus consistent by closing keyboard on mobile
  //     (document.activeElement as HTMLElement | null)?.blur();
  //   }
  // }
}
