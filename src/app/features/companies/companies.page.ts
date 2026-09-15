import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';

/** Módulo Empresas — clientes y datos maestros (§7). */
@Component({
  selector: 'app-companies-page',
  imports: [StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Empresas</h1>
          <p class="ag-page__sub">
            Importadores, transportistas y estaciones de servicio contratantes.
          </p>
        </div>
      </header>
      <article class="ag-card ag-card--flush">
        <table class="ag-table">
          <thead>
            <tr>
              <th>Empresa</th>
              <th>NIT</th>
              <th>Tipo</th>
              <th>Contacto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (company of companies(); track company.id) {
              <tr>
                <td>{{ company.name }}</td>
                <td class="ag-mono">{{ company.nit }}</td>
                <td>{{ company.kind }}</td>
                <td>
                  {{ company.contactName }}
                  <br />
                  <span class="ag-muted">{{ company.contactEmail }}</span>
                </td>
                <td>
                  <app-status-badge
                    [label]="company.active ? 'Activa' : 'Inactiva'"
                    [tone]="company.active ? 'ok' : 'neutral'"
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
export class CompaniesPage {
  protected readonly companies = inject(AdminGoStore).companies;
}
