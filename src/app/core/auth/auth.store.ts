import { Injectable, computed, signal } from '@angular/core';
import { User } from '@core/models/entities';
import { UserRole } from '@core/models/enums';
import { USERS } from '../data/mock-data';

/**
 * Contraseña única del prototipo: todavía no hay backend (P1 §33, §29),
 * así que la credencial se valida aquí mismo contra el dataset demo.
 */
export const DEMO_PASSWORD = 'demo123';

const SESSION_KEY = 'admingo.session';

export interface LoginResult {
  ok: boolean;
  error?: string;
}

/**
 * Sesión de usuario del prototipo (§6, §33): login contra el dataset demo,
 * persistencia en `sessionStorage` para sobrevivir recargas y consulta de rol.
 * Cuando exista el backend (§30) este store se reemplazará por auth real
 * (tokens JWT) sin tocar los guards ni las pantallas.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _currentUser = signal<User | null>(null);

  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  constructor() {
    this.restoreSession();
  }

  login(username: string, password: string): LoginResult {
    const normalized = username.trim().toLowerCase();
    const user = USERS.find((candidate) => candidate.username === normalized);

    if (!user || password !== DEMO_PASSWORD) {
      return { ok: false, error: 'Usuario o contraseña incorrectos.' };
    }
    if (!user.active) {
      return { ok: false, error: 'El usuario está desactivado. Contacte al administrador.' };
    }

    this._currentUser.set(user);
    try {
      sessionStorage.setItem(SESSION_KEY, user.id);
    } catch {
      /* almacenamiento no disponible: la sesión vive solo en memoria */
    }
    return { ok: true };
  }

  logout(): void {
    this._currentUser.set(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* idem */
    }
  }

  isInRole(role: UserRole): boolean {
    return this._currentUser()?.role === role;
  }

  /** Rehidrata la sesión tras recargar la página. */
  private restoreSession(): void {
    try {
      const id = sessionStorage.getItem(SESSION_KEY);
      const user = id
        ? USERS.find((candidate) => candidate.id === id && candidate.active)
        : undefined;
      if (user) {
        this._currentUser.set(user);
      }
    } catch {
      /* sin sessionStorage no hay sesión persistente */
    }
  }
}
