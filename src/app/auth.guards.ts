import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './services/auth.service';

/**
 * Guard to protect routes that are only accessible to guests (non-authenticated users).
 * Redirects to experiments if authenticated.
 */
export const guestOnlyGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isAuthenticated()
    ? router.createUrlTree(['/experiments'])
    : true;
};

/**
 * Guard to protect routes that require authentication.
 * Redirects to log in if not authenticated.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isAuthenticated()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }); // TODO: redirect to intended page after login
};

/**
 * Guard to protect routes that require admin privileges.
 * Redirects to experiments if not an admin.
 */
export const adminGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  return authService.isAdmin()
    ? true
    : router.createUrlTree(['/experiments']);
};
