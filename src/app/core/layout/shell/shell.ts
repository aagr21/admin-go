import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthStore } from '@core/auth/auth.store';
import { filterNavGroups } from '@core/auth/role-access';
import { DATASET_LAST_SYNC_ISO } from '@core/data/dataset-date';
import { NAV_GROUPS } from '@core/layout/navigation';
import { AdminGoStore } from '@core/services/admin-go.store';
import { formatDateTime } from '@shared/util/format';

/** Ancho a partir del cual la barra lateral pasa a ser un cajón superpuesto. */
const MOBILE_QUERY = '(max-width: 900px)';

/** Layout principal: barra lateral de módulos (§7) + barra superior de contexto. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly store = inject(AdminGoStore);
  /** Escritorio: rail de iconos. Móvil: cajón abierto o cerrado. */
  protected readonly collapsed = signal(false);
  protected readonly mobileNavOpen = signal(false);
  protected readonly lastUpdate = formatDateTime(DATASET_LAST_SYNC_ISO);

  /** Estado de la capa de datos, para avisar sin dejar la pantalla vacía (§29). */
  protected readonly error = this.store.error;
  protected readonly busy = this.store.busy;
  protected readonly ready = this.store.ready;

  /** El `authGuard` garantiza sesión activa; el menú (§7) se filtra por rol (§6). */
  protected readonly user = computed(() => this.auth.currentUser());
  protected readonly initials = computed(() => {
    const name = this.user()?.fullName ?? '';
    return name
      .split(' ')
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  });

  protected readonly navGroups = computed(() =>
    filterNavGroups(NAV_GROUPS, this.auth.currentUser()?.role ?? null),
  );
  protected readonly kpis = this.store.kpis;

  constructor() {
    // Al navegar desde el cajón móvil, este se cierra solo.
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.mobileNavOpen.set(false));
  }

  /**
   * Un solo botón para dos comportamientos: en móvil abre el cajón y en
   * escritorio repliega el rail. Se consulta el ancho en el momento del clic
   * para no arrastrar estado inconsistente al redimensionar.
   */
  protected toggleSidebar(): void {
    if (window.matchMedia?.(MOBILE_QUERY).matches) {
      this.mobileNavOpen.update((value) => !value);
      return;
    }
    this.collapsed.update((value) => !value);
  }

  protected closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  protected dismissError(): void {
    this.store.clearError();
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
