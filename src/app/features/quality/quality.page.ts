import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatDateTime, toneForStatus } from '@shared/util/format';

/** Módulo Producto y calidad — controles, certificados, muestras y resultados (§22). */
@Component({
  selector: 'app-quality-page',
  imports: [StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Producto y calidad</h1>
          <p class="ag-page__sub">
            Trazabilidad documental y operativa de controles, certificados y muestras.
          </p>
        </div>
      </header>
      <article class="ag-card ag-card--flush">
        <table class="ag-table">
          <thead>
            <tr>
              <th>Control</th>
              <th>Producto / Lote</th>
              <th>Planta</th>
              <th>Tipo de control</th>
              <th>Resultado</th>
              <th>Certificado</th>
              <th>Fecha</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (control of controls(); track control.id) {
              <tr>
                <td class="ag-mono">{{ control.code }}</td>
                <td>
                  {{ control.product }}
                  <br />
                  <span class="ag-muted ag-mono">{{ control.lot }}</span>
                </td>
                <td>{{ plantName(control.plantId) }}</td>
                <td>{{ control.controlType }}</td>
                <td>{{ control.result }}</td>
                <td class="ag-mono">{{ control.certificate ?? '—' }}</td>
                <td>{{ formatDateTime(control.controlledAt) }}</td>
                <td>
                  <app-status-badge
                    [label]="control.status"
                    [tone]="toneForStatus(control.status)"
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
export class QualityPage {
  private readonly store = inject(AdminGoStore);
  protected readonly controls = this.store.qualityControls;
  protected readonly formatDateTime = formatDateTime;
  protected readonly toneForStatus = toneForStatus;

  protected plantName(plantId: string): string {
    return this.store.plantById(plantId)?.name ?? '—';
  }
}
