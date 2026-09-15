import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Tank } from '@core/models/entities';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatDateTime, formatLiters } from '@shared/util/format';
import {
  labelForPlantStatus,
  toneForPlantStatus,
  toneForVolumeDifference,
} from '@shared/util/status';

/** Módulo Tanques — capacidad, mediciones, inventarios y diferencias (§21). */
@Component({
  selector: 'app-tanks-page',
  imports: [StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Tanques</h1>
          <p class="ag-page__sub">
            Medición física, volumen calculado, historial y diferencias por tanque.
          </p>
        </div>
      </header>
      <article class="ag-card ag-card--flush">
        <table class="ag-table ag-table--stack">
          <thead>
            <tr>
              <th>Código</th>
              <th>Estación</th>
              <th>Producto</th>
              <th class="ag-num">Capacidad</th>
              <th class="ag-num">Físico</th>
              <th class="ag-num">Teórico</th>
              <th class="ag-num">Diferencia</th>
              <th>Última medición</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (tank of tanks(); track tank.id) {
              <tr>
                <td data-label="Código" class="ag-mono">{{ tank.code }}</td>
                <td data-label="Estación">{{ stationName(tank.stationId) }}</td>
                <td data-label="Producto">{{ tank.product }}</td>
                <td data-label="Capacidad" class="ag-num">{{ formatLiters(tank.capacity) }}</td>
                <td data-label="Físico" class="ag-num">{{ formatLiters(tank.physicalVolume) }}</td>
                <td data-label="Teórico" class="ag-num">
                  {{ formatLiters(tank.theoreticalVolume) }}
                </td>
                <td data-label="Diferencia" class="ag-num">
                  <app-status-badge
                    [label]="formatLiters(tank.physicalVolume - tank.theoreticalVolume)"
                    [tone]="volumeDiffTone(tank)"
                  />
                </td>
                <td data-label="Última medición">{{ formatDateTime(tank.lastMeasuredAt) }}</td>
                <td data-label="Estado">
                  <app-status-badge
                    [label]="labelForPlantStatus(tank.status)"
                    [tone]="toneForPlantStatus(tank.status)"
                  />
                </td>
              </tr>
            }
          </tbody>
        </table>
      </article>
    </section>
  `,
})
export class TanksPage {
  private readonly store = inject(AdminGoStore);
  protected readonly tanks = this.store.tanks;
  protected readonly formatLiters = formatLiters;
  protected readonly formatDateTime = formatDateTime;
  protected readonly labelForPlantStatus = labelForPlantStatus;
  protected readonly toneForPlantStatus = toneForPlantStatus;

  /** Semáforo de la diferencia físico/teórico con el umbral configurado (§14). */
  protected volumeDiffTone(tank: Tank) {
    return toneForVolumeDifference(
      tank.physicalVolume - tank.theoreticalVolume,
      tank.theoreticalVolume,
      this.store.maxVolumeDifferencePercent(),
    );
  }

  protected stationName(stationId: string): string {
    return this.store.stationById(stationId)?.name ?? '—';
  }
}
