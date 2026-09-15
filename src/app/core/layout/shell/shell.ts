import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '@core/auth/auth.store';
import { filterNavGroups } from '@core/auth/role-access';
import { NAV_GROUPS } from '@core/layout/navigation';
import { AdminGoStore } from '@core/services/admin-go.store';
import { formatDateTime } from '@shared/util/format';

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
  protected readonly collapsed = signal(false);
  protected readonly lastUpdate = formatDateTime('2026-09-14T09:30:00');

  /** El `authGuard` garantiza sesión activa; el menú (§7) se filtra por rol (§6). */
  protected readonly user = computed(() => this.auth.currentUser()!);
  protected readonly navGroups = computed(() =>
    filterNavGroups(NAV_GROUPS, this.auth.currentUser()?.role ?? null),
  );
  protected readonly kpis = this.store.kpis;
  protected readonly initials = computed(() =>
    this.user()
      .fullName.split(' ')
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );

  protected toggleSidebar(): void {
    this.collapsed.update((value) => !value);
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
