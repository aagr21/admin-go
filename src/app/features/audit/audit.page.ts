import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminGoStore } from '@core/services/admin-go.store';
import { formatDateTime } from '@shared/util/format';

/** Módulo Auditoría — historial de acciones críticas (§27). */
@Component({
  selector: 'app-audit-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Auditoría</h1>
          <p class="ag-page__sub">NO BORRAR HISTORIAL CRÍTICO. ANULAR + JUSTIFICAR + REGISTRAR.</p>
        </div>
      </header>
      <article class="ag-card ag-card--flush">
        <table class="ag-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Fecha / hora</th>
              <th>Entidad</th>
              <th>Campo</th>
              <th>Anterior</th>
              <th>Nuevo</th>
              <th>Acción</th>
            </tr>
          </thead>
          <tbody>
            @for (log of logs(); track log.id) {
              <tr>
                <td class="ag-mono">{{ log.username }}</td>
                <td>{{ formatDateTime(log.at) }}</td>
                <td class="ag-mono">{{ log.entityRef }}</td>
                <td>{{ log.field }}</td>
                <td class="ag-muted">{{ log.previousValue }}</td>
                <td class="strong">{{ log.newValue }}</td>
                <td>{{ log.action }}</td>
              </tr>
            }
          </tbody>
        </table>
      </article>
    </section>
  `,
  styles: `
    .strong {
      font-weight: 600;
      color: var(--ag-primary-600);
    }
  `,
})
export class AuditPage {
  protected readonly logs = inject(AdminGoStore).auditLogs;
  protected readonly formatDateTime = formatDateTime;
}
