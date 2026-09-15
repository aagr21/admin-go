import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatLiters, labelForCompliance, toneForStatus } from '@shared/util/format';

/** Módulo Declaraciones — consolidación, validación previa y planillas (§17, §18). */
@Component({
  selector: 'app-declarations-page',
  imports: [StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Declaraciones y planillas</h1>
          <p class="ag-page__sub">CHECK ADMIN GO → OK / OBSERVADO / CRÍTICO</p>
        </div>
      </header>
      <article class="ag-card ag-card--flush">
        <table class="ag-table">
          <thead>
            <tr>
              <th>Declaración</th>
              <th>Periodo</th>
              <th class="ag-num">Operaciones</th>
              <th class="ag-num">Volumen</th>
              <th class="ag-num">Inventario cierre</th>
              <th class="ag-num">Ajustes</th>
              <th>Validación</th>
              <th>Estado</th>
              <th>Presentada</th>
            </tr>
          </thead>
          <tbody>
            @for (declaration of declarations(); track declaration.id) {
              <tr>
                <td class="ag-mono">{{ declaration.code }}</td>
                <td>{{ declaration.period }}</td>
                <td class="ag-num">{{ declaration.operationsCount }}</td>
                <td class="ag-num">{{ formatLiters(declaration.totalVolume) }}</td>
                <td class="ag-num">{{ formatLiters(declaration.closingInventory) }}</td>
                <td class="ag-num">{{ formatLiters(declaration.adjustments) }}</td>
                <td>
                  <app-status-badge
                    [label]="labelForCompliance(declaration.validation)"
                    [tone]="toneForStatus(declaration.validation)"
                  />
                </td>
                <td>
                  <app-status-badge
                    [label]="declaration.status"
                    [tone]="toneForStatus(declaration.status)"
                  />
                </td>
                <td>{{ declaration.presentedAt ? 'Sí' : 'No' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </article>
      <p class="ag-muted">
        La presentación se realiza por los mecanismos y sujetos autorizados que correspondan (§17).
      </p>
    </section>
  `,
})
export class DeclarationsPage {
  protected readonly declarations = inject(AdminGoStore).declarations;
  protected readonly formatLiters = formatLiters;
  protected readonly labelForCompliance = labelForCompliance;
  protected readonly toneForStatus = toneForStatus;
}
