import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminGoStore } from '@core/services/admin-go.store';
import { KpiCard } from '@shared/ui/kpi-card';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatLiters, formatPercent, Tone } from '@shared/util/format';
import {
  toneForAlertSeverity,
  toneForOperationStatus,
  toneForVolumeDifference,
} from '@shared/util/status';

/** Torre de Control — visión nacional consolidada de toda la operación (§8). */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, KpiCard, StatusBadge],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  private readonly store = inject(AdminGoStore);

  protected readonly kpis = this.store.kpis;
  protected readonly plants = this.store.plants;
  protected readonly operations = this.store.operations;
  protected readonly criticalAlerts = this.store.criticalAlerts;

  protected readonly formatLiters = formatLiters;
  protected readonly formatPercent = formatPercent;
  protected readonly toneForAlertSeverity = toneForAlertSeverity;
  protected readonly toneForOperationStatus = toneForOperationStatus;
  protected readonly volumeDiffTone = computed(() =>
    toneForVolumeDifference(
      this.kpis().volumeDifference,
      this.kpis().theoreticalInventory,
      this.store.maxVolumeDifferencePercent(),
    ),
  );

  /** Semáforo del AdminScore global: verde ≥ 80, amarillo ≥ 60, rojo por debajo. */
  protected scoreTone(score: number): Tone {
    if (score >= 80) {
      return 'ok';
    }
    return score >= 60 ? 'warn' : 'danger';
  }
}
