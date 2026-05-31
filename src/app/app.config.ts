import {
  ApplicationConfig, inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideRouter,
  withComponentInputBinding,
  withExperimentalPlatformNavigation,
  withViewTransitions
} from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { IconResolver, MatIconRegistry } from '@angular/material/icon';
import * as echarts from 'echarts';

import { routes } from './app.routes';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { DomSanitizer } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withExperimentalPlatformNavigation(), withViewTransitions()),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideEchartsCore({ echarts }),
    provideAppInitializer(() => {
      // Initialize ThemeService to apply stored theme on app startup
      const themeService = inject(ThemeService);
      const authService = inject(AuthService);
      // Set up Material Icon component to use "Material Symbols Rounded" by default
      const sanitizer = inject(DomSanitizer);
      const initializerFn = ((iconRegistry: MatIconRegistry) => () => {
        const defaultFontSetClasses = iconRegistry.getDefaultFontSetClass();
        const outlinedFontSetClasses = defaultFontSetClasses
          .filter((fontSetClass) => fontSetClass !== 'material-icons')
          .concat(['material-symbols-rounded']);
        iconRegistry.setDefaultFontSetClass(...outlinedFontSetClasses);
        // Register a resolver to load SVG icons from the `assets/icons` directory
        const resolver: IconResolver = (name) =>
          sanitizer.bypassSecurityTrustResourceUrl(`assets/icons/${name}.svg`);
        iconRegistry.addSvgIconResolver(resolver);
      })(inject(MatIconRegistry));
      initializerFn();
      return authService.initialize();
    })
  ]
};
