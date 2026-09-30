import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore, DEMO_PASSWORD } from '@core/auth/auth.store';
import { LoadingService } from '@core/services/loading.service';
import { USERS } from '@core/data/mock-data';

/**
 * Accesos de demostración derivados del propio dataset: mantener una lista
 * paralela garantizaba que antes o después divergiera de `USERS`.
 */
const DEMO_USERS = USERS.filter((user) => user.active).map(({ username, role }) => ({
  username,
  role,
}));

/**
 * Pantalla de acceso (P1 §33): valida credenciales contra el dataset demo y
 * vuelve al destino solicitado antes del redirect del `authGuard`. Cuando
 * exista backend (§30) el submit llamará a la API sin cambiar esta pantalla.
 *
 * La transición login → dashboard muestra un splash global con el logo
 * (controlado por `LoadingService`) para que el cambio de ruta se sienta
 * intencional y no un salto seco.
 */
@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly loading = inject(LoadingService);

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);

  protected readonly demoPassword = DEMO_PASSWORD;
  protected readonly demoUsers = DEMO_USERS;

  constructor() {
    if (this.auth.isAuthenticated()) {
      this.redirect();
    }
  }

  protected setUsername(event: Event): void {
    this.username.set((event.target as HTMLInputElement).value);
  }

  protected setPassword(event: Event): void {
    this.password.set((event.target as HTMLInputElement).value);
  }

  /** Rellena el formulario con un acceso del prototipo (clic en la tarjeta). */
  protected fill(username: string): void {
    this.username.set(username);
    this.password.set(DEMO_PASSWORD);
    this.error.set(null);
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const result = this.auth.login(this.username(), this.password());
    if (result.ok) {
      this.redirect();
      return;
    }
    this.error.set(result.error ?? 'Credenciales invalidas.');
  }

  /** Navega al destino post-login mostrando el splash de transición. */
  private redirect(): void {
    this.loading.show();
    // Simula la carga de la sesión (3s) para que el splash sea perceptible.
    setTimeout(() => {
      void this.router.navigateByUrl(this.returnUrl);
    }, 3000);
  }

  /** Destino post-login: solo rutas internas (evita open redirect). */
  private get returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') ? url : '/dashboard';
  }
}
