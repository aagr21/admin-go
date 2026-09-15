import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatLiters, toneForStatus } from '@shared/util/format';

/** Módulo Cisternas — unidades, conductores, precintos y trazabilidad (§19). */
@Component({
  selector: 'app-cisterns-page',
  imports: [StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Cisternas</h1>
          <p class="ag-page__sub">
            Capacidad, conductor asignado, precintos, documentación y estado operativo.
          </p>
        </div>
      </header>
      <article class="ag-card ag-card--flush">
        <table class="ag-table">
          <thead>
            <tr>
              <th>Placa</th>
              <th>Conductor</th>
              <th class="ag-num">Capacidad</th>
              <th>Precintos</th>
              <th class="ag-num">Operaciones</th>
              <th>Documentación</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (cistern of cisterns(); track cistern.id) {
              <tr>
                <td class="ag-mono">{{ cistern.plate }}</td>
                <td>{{ driverName(cistern.driverId) }}</td>
                <td class="ag-num">{{ formatLiters(cistern.capacity) }}</td>
                <td>
                  @for (seal of cistern.sealCodes; track seal) {
                    <span class="seal ag-mono">{{ seal }}</span>
                  }
                </td>
                <td class="ag-num">{{ cistern.operationsCount }}</td>
                <td>
                  <app-status-badge
                    [label]="cistern.documentStatus"
                    [tone]="toneForStatus(cistern.documentStatus)"
                  />
                </td>
                <td>
                  <app-status-badge
                    [label]="cistern.status"
                    [tone]="
                      cistern.status === 'Disponible' || cistern.status === 'En planta'
                        ? 'ok'
                        : cistern.status === 'En ruta'
                          ? 'info'
                          : 'warn'
                    "
                  />
                </td>
              </tr>
            }
          </tbody>
        </table>
      </article>
    </section>
  `,
  styles: `
    .seal {
      display: inline-block;
      padding: 0.1rem 0.4rem;
      margin: 0 0.25rem 0.15rem 0;
      font-size: 0.7rem;
      border-radius: 6px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      color: #475569;
    }
  `,
})
export class CisternsPage {
  private readonly store = inject(AdminGoStore);
  protected readonly cisterns = this.store.cisterns;
  protected readonly formatLiters = formatLiters;
  protected readonly toneForStatus = toneForStatus;

  protected driverName(driverId: string): string {
    return this.store.driverById(driverId)?.fullName ?? '—';
  }
}
