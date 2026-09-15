import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ALERT_SEVERITIES, ALERT_STATUSES, ALERT_TYPES } from '@core/models/enums';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatDateTime, labelForSeverity, toneForStatus } from '@shared/util/format';

/** Módulo Alertas — eventos documentales, operativos y volumétricos (§25). */
@Component({
  selector: 'app-alerts-page',
  imports: [StatusBadge, RouterLink],
  templateUrl: './alerts.html',
  styleUrl: './alerts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertsPage {
  private readonly store = inject(AdminGoStore);

  protected readonly severities = ALERT_SEVERITIES;
  protected readonly statuses = ALERT_STATUSES;
  protected readonly types = ALERT_TYPES;
  protected readonly severityFilter = signal('all');
  protected readonly statusFilter = signal('all');
  protected readonly typeFilter = signal('all');

  protected readonly filtered = computed(() =>
    this.store.alerts().filter((alert) => {
      const matchesSeverity =
        this.severityFilter() === 'all' || alert.severity === this.severityFilter();
      const matchesStatus = this.statusFilter() === 'all' || alert.status === this.statusFilter();
      const matchesType = this.typeFilter() === 'all' || alert.type === this.typeFilter();
      return matchesSeverity && matchesStatus && matchesType;
    }),
  );

  protected readonly countsByType = computed(() =>
    ALERT_TYPES.map((type) => {
      const ofType = this.store.alerts().filter((alert) => alert.type === type);
      return {
        type,
        total: ofType.length,
        open: ofType.filter((alert) => alert.status !== 'Atendida').length,
      };
    }),
  );

  protected readonly formatDateTime = formatDateTime;
  protected readonly labelForSeverity = labelForSeverity;
  protected readonly toneForStatus = toneForStatus;

  protected plantName(plantId: string | null): string {
    return this.store.plantById(plantId)?.code ?? '—';
  }

  protected operationCode(entityRef: string): string | null {
    return this.store.operationByCode(entityRef) ? entityRef : null;
  }

  protected onSeverity(event: Event): void {
    this.severityFilter.set((event.target as HTMLSelectElement).value);
  }

  protected onStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  protected onType(event: Event): void {
    this.typeFilter.set((event.target as HTMLSelectElement).value);
  }
}
