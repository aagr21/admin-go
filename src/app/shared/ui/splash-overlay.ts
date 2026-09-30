import { ChangeDetectionStrategy, Component, inject, OnInit, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { LoadingService } from '@core/services/loading.service';
import { Subscription, filter } from 'rxjs';

/**
 * Splash screen global con el logo de TrazaFuel.
 *
 * Se muestra como overlay a pantalla completa durante transiciones de ruta
 * (login → dashboard). Vive en `app.html` para que sobreviva al cambio de
 * componente: si estuviera dentro del login, se destruiría al navegar.
 *
 * Se oculta automáticamente cuando la navegación termina (el dashboard ya
 * está listo) o tras un tiempo máximo de seguridad.
 */
@Component({
  selector: 'app-splash-overlay',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="splash-overlay" role="status" aria-live="polite" aria-label="Cargando">
        <div class="splash-overlay__content">
          <img src="logo.png" alt="TrazaFuel" class="splash-overlay__logo" />
          <div class="splash-overlay__spinner" aria-hidden="true"></div>
          <p class="splash-overlay__text">Cargando TrazaFuel…</p>
        </div>
      </div>
    }
  `,
  styles: `
    .splash-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: grid;
      place-items: center;
      background:
        radial-gradient(1100px 500px at 15% -10%, rgba(3, 179, 255, 0.15), transparent 60%),
        linear-gradient(160deg, #000013 0%, #001531 50%, #002252 100%);
      animation: splash-fade-in 0.2s ease-out;
    }

    .splash-overlay__content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
    }

    .splash-overlay__logo {
      width: 280px;
      height: auto;
      object-fit: contain;
      filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.35));
      animation: splash-pulse 1.6s ease-in-out infinite;
    }

    .splash-overlay__spinner {
      width: 36px;
      height: 36px;
      border: 3px solid rgba(3, 179, 255, 0.25);
      border-top-color: #03b3ff;
      border-radius: 50%;
      animation: splash-spin 0.8s linear infinite;
    }

    .splash-overlay__text {
      margin: 0;
      font-size: 0.85rem;
      font-weight: 500;
      letter-spacing: 0.04em;
      color: #f4f8fb;
    }

    @keyframes splash-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes splash-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes splash-pulse {
      0%,
      100% {
        transform: scale(1);
        opacity: 1;
      }
      50% {
        transform: scale(1.04);
        opacity: 0.92;
      }
    }
  `,
})
export class SplashOverlay implements OnInit, OnDestroy {
  private readonly loading = inject(LoadingService);
  private readonly router = inject(Router);
  protected readonly visible = this.loading.visible;
  private routerSub: Subscription | null = null;
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Oculta el splash cuando la navegación termina y el splash está visible.
    this.routerSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.visible()) {
          // Pequeño retardo para que el dashboard se renderice antes de ocultar.
          setTimeout(() => this.loading.hide(), 150);
        }
      });
  }

  ngOnInit(): void {
    // Seguridad: si algo falla, ocultar tras 3s máximo.
    this.hideTimeout = setTimeout(() => this.loading.hide(), 3000);
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
    }
  }
}
