import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatLiters } from '@shared/util/format';
import { toneForCisternStatus, toneForDocumentStatus } from '@shared/util/status';

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
        <table class="ag-table ag-table--stack">
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
                <td data-label="Placa" class="ag-mono">{{ cistern.plate }}</td>
                <td data-label="Conductor">{{ driverName(cistern.driverId) }}</td>
                <td data-label="Capacidad" class="ag-num">{{ formatLiters(cistern.capacity) }}</td>
                <td data-label="Precintos">
                  @for (seal of cistern.sealCodes; track seal) {
                    <span class="seal ag-mono">{{ seal }}</span>
                  }
                </td>
                <td data-label="Operaciones" class="ag-num">{{ cistern.operationsCount }}</td>
                <td data-label="Documentación">
                  <app-status-badge
                    [label]="cistern.documentStatus"
                    [tone]="toneForDocumentStatus(cistern.documentStatus)"
                  />
                </td>
                <td data-label="Estado">
                  <app-status-badge
                    [label]="cistern.status"
                    [tone]="toneForCisternStatus(cistern.status)"
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
  protected readonly toneForCisternStatus = toneForCisternStatus;
  protected readonly toneForDocumentStatus = toneForDocumentStatus;

  protected driverName(driverId: string): string {
    return this.store.driverById(driverId)?.fullName ?? '—';
  }
}
