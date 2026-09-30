import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { provideTrazaFuelApi } from '@core/api/api.provider';
import { TrazaFuelStore } from '@core/services/traza-fuel.store';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Origen de datos (§29, §31): hoy en memoria, mañana HTTP.
    provideTrazaFuelApi(),
    // Carga inicial antes de renderizar: la UI nunca ve una pantalla a medias.
    provideAppInitializer(() => inject(TrazaFuelStore).load()),
  ],
};
