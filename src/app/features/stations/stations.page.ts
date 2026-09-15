import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatLiters } from '@shared/util/format';
import { labelForPlantStatus, toneForPlantStatus } from '@shared/util/status';

/** Módulo Estaciones de servicio (EESS) (§20). */
@Component({
  selector: 'app-stations-page',
  imports: [StatusBadge, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Estaciones de servicio</h1>
          <p class="ag-page__sub">EESS, tanques asociados, recepciones, despachos e inventario.</p>
        </div>
      </header>
      <article class="ag-card ag-card--flush">
        <table class="ag-table ag-table--stack">
          <thead>
            <tr>
              <th>Código</th>
              <th>Estación</th>
              <th>Responsable</th>
              <th class="ag-num">Inventario</th>
              <th class="ag-num">Recibido hoy</th>
              <th class="ag-num">Despachado hoy</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (station of stations(); track station.id) {
              <tr>
                <td data-label="Código" class="ag-mono">{{ station.code }}</td>
                <td data-label="Estación">
                  {{ station.name }}
                  <br />
                  <span class="ag-muted">{{ station.city }}</span>
                </td>
                <td data-label="Responsable">{{ station.manager }}</td>
                <td data-label="Inventario" class="ag-num">
                  {{ formatLiters(station.inventory) }}
                </td>
                <td data-label="Recibido hoy" class="ag-num">
                  {{ formatLiters(station.receivedToday) }}
                </td>
                <td data-label="Despachado hoy" class="ag-num">
                  {{ formatLiters(station.dispatchedToday) }}
                </td>
                <td data-label="Estado">
                  <app-status-badge
                    [label]="labelForPlantStatus(station.status)"
                    [tone]="toneForPlantStatus(station.status)"
                  />
                </td>
              </tr>
            }
          </tbody>
        </table>
      </article>
      <p class="ag-muted">
        Los tanques asociados se detallan en el módulo
        <a class="link" routerLink="/tanks">Tanques</a>.
      </p>
    </section>
  `,
  styles: `
    .link {
      color: var(--ag-primary-600);
      font-weight: 600;
    }
  `,
})
export class StationsPage {
  protected readonly stations = inject(AdminGoStore).stations;
  protected readonly formatLiters = formatLiters;
  protected readonly labelForPlantStatus = labelForPlantStatus;
  protected readonly toneForPlantStatus = toneForPlantStatus;
}
