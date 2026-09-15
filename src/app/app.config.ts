import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { provideAdminGoApi } from '@core/api/api.provider';
import { AdminGoStore } from '@core/services/admin-go.store';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Origen de datos (§29, §31): hoy en memoria, mañana HTTP.
    provideAdminGoApi(),
    // Carga inicial antes de renderizar: la UI nunca ve una pantalla a medias.
    provideAppInitializer(() => inject(AdminGoStore).load()),
  ],
};
