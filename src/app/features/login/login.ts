import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthStore, DEMO_PASSWORD } from '@core/auth/auth.store';

interface DemoUser {
  username: string;
  role: string;
}

const DEMO_USERS: DemoUser[] = [
  { username: 'admin', role: 'Superadministrador AdminGo' },
  { username: 'mrojas', role: 'Administrador cliente' },
  { username: 'gerente.andina', role: 'Gerente' },
  { username: 'regulatorio.andina', role: 'Responsable regulatorio' },
  { username: 'sup.campo01', role: 'Supervisor operativo AdminGo' },
  { username: 'operador01', role: 'Operador de campo' },
  { username: 'eess.central', role: 'Responsable EESS' },
  { username: 'auditor.01', role: 'Auditor' },
];

/**
 * Pantalla de acceso (P1 §33): valida credenciales contra el dataset demo y
 * vuelve al destino solicitado antes del redirect del `authGuard`. Cuando
 * exista backend (§30) el submit llamará a la API sin cambiar esta pantalla.
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

  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);

  protected readonly demoPassword = DEMO_PASSWORD;
  protected readonly demoUsers = DEMO_USERS;

  constructor() {
    if (this.auth.isAuthenticated()) {
      void this.router.navigateByUrl(this.returnUrl);
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
      void this.router.navigateByUrl(this.returnUrl);
      return;
    }
    this.error.set(result.error ?? 'Credenciales inválidas.');
  }

  /** Destino post-login: solo rutas internas (evita open redirect). */
  private get returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') ? url : '/dashboard';
  }
}
