import {
  ApplicationConfig, inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { MatIconRegistry } from '@angular/material/icon';
import * as echarts from 'echarts';

import { routes } from './app.routes';
import { ThemeService } from './services/theme.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideEchartsCore({ echarts }),
    provideAppInitializer(() => {
      // Initialize ThemeService to apply stored theme on app startup
      const themeService = inject(ThemeService);
      // Set up Material Icon component to use "Material Symbols Rounded" by default
      const initializerFn = ((iconRegistry: MatIconRegistry) => () => {
        const defaultFontSetClasses = iconRegistry.getDefaultFontSetClass();
        const outlinedFontSetClasses = defaultFontSetClasses
          .filter((fontSetClass) => fontSetClass !== 'material-icons')
          .concat(['material-symbols-rounded']);
        iconRegistry.setDefaultFontSetClass(...outlinedFontSetClasses);
      })(inject(MatIconRegistry));
      return initializerFn();
    })
  ]
};
