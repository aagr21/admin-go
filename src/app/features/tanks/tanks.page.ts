import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { differenceTone, formatDateTime, formatLiters, toneForStatus } from '@shared/util/format';

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
        <table class="ag-table">
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
                <td class="ag-mono">{{ tank.code }}</td>
                <td>{{ stationName(tank.stationId) }}</td>
                <td>{{ tank.product }}</td>
                <td class="ag-num">{{ formatLiters(tank.capacity) }}</td>
                <td class="ag-num">{{ formatLiters(tank.physicalVolume) }}</td>
                <td class="ag-num">{{ formatLiters(tank.theoreticalVolume) }}</td>
                <td class="ag-num">
                  <app-status-badge
                    [label]="formatLiters(tank.physicalVolume - tank.theoreticalVolume)"
                    [tone]="differenceTone(tank.physicalVolume - tank.theoreticalVolume)"
                  />
                </td>
                <td>{{ formatDateTime(tank.lastMeasuredAt) }}</td>
                <td>
                  <app-status-badge
                    [label]="tank.status === 'green' ? 'Normal' : 'Observado'"
                    [tone]="toneForStatus(tank.status)"
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
  protected readonly differenceTone = differenceTone;
  protected readonly toneForStatus = toneForStatus;

  protected stationName(stationId: string): string {
    return this.store.stationById(stationId)?.name ?? '—';
  }
}
