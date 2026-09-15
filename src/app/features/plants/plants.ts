import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatDateTime, formatLiters } from '@shared/util/format';
import { labelForPlantStatus, toneForPlantStatus } from '@shared/util/status';

/** Módulo Plantas — red de 16 plantas (§9). */
@Component({
  selector: 'app-plants',
  imports: [StatusBadge, RouterLink],
  templateUrl: './plants.html',
  styleUrl: './plants.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Plants {
  private readonly store = inject(AdminGoStore);

  protected readonly plants = this.store.plantsBySeverity;
  protected readonly kpis = this.store.kpis;
  protected readonly formatLiters = formatLiters;
  protected readonly formatDateTime = formatDateTime;
  protected readonly labelForPlantStatus = labelForPlantStatus;
  protected readonly toneForPlantStatus = toneForPlantStatus;

  protected plantAlerts(plantId: string): number {
    return this.store.alertsOfPlant(plantId).filter((alert) => alert.status !== 'Atendida').length;
  }
}
