import { Injectable, signal } from '@angular/core';

/**
 * Controla el splash screen global que se muestra durante transiciones
 * de ruta (login → dashboard, recargas, etc.).
 *
 * Vive en la raíz para que el overlay sobreviva al cambio de componente:
 * si el splash viviera dentro del login, se destruiría al navegar y la
 * transición no se vería.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _visible = signal(false);
  readonly visible = this._visible.asReadonly();

  /** Muestra el splash global. */
  show(): void {
    this._visible.set(true);
  }

  /** Oculta el splash global. */
  hide(): void {
    this._visible.set(false);
  }
}
