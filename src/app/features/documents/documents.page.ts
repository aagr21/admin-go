import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DOCUMENT_STATUSES } from '@core/models/enums';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { daysUntil, toneForStatus } from '@shared/util/format';

/** Módulo Documentos — expedientes, vencimientos y versiones (§15, §16). */
@Component({
  selector: 'app-documents-page',
  imports: [StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Documentos</h1>
          <p class="ag-page__sub">Carga, clasificación, vencimientos, versiones y evidencias.</p>
        </div>
        <div class="ag-row">
          <span class="chip chip--danger">{{ kpis().documentsExpired }} vencidos</span>
          <span class="chip chip--warn">{{ kpis().documentsExpiringSoon }} por vencer</span>
        </div>
      </header>

      <div class="filters ag-card">
        <label class="filter">
          <span>Buscar</span>
          <input
            type="search"
            placeholder="Nombre, código o categoría…"
            [value]="search()"
            (input)="onSearch($event)"
          />
        </label>
        <label class="filter">
          <span>Estado</span>
          <select [value]="statusFilter()" (change)="onStatus($event)">
            <option value="all">Todos</option>
            @for (status of statuses; track status) {
              <option [value]="status">{{ status }}</option>
            }
          </select>
        </label>
        <span class="filters__count">{{ filtered().length }} documentos</span>
      </div>

      <article class="ag-card ag-card--flush">
        <div class="table-wrap">
          <table class="ag-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Documento</th>
                <th>Categoría</th>
                <th>Empresa</th>
                <th>Operación</th>
                <th>Emisión</th>
                <th>Vencimiento</th>
                <th class="ag-num">Días</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              @for (document of filtered(); track document.id) {
                <tr>
                  <td class="ag-mono">{{ document.code }}</td>
                  <td>{{ document.name }}</td>
                  <td>{{ document.category }}</td>
                  <td>{{ companyName(document.companyId) }}</td>
                  <td class="ag-mono">{{ operationCode(document.operationId) }}</td>
                  <td>{{ document.issuedAt }}</td>
                  <td>{{ document.expiresAt ?? '—' }}</td>
                  <td class="ag-num">{{ remainingDays(document.expiresAt) }}</td>
                  <td>
                    <app-status-badge
                      [label]="document.status"
                      [tone]="toneForStatus(document.status)"
                    />
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="9" class="ag-muted empty">Sin documentos que coincidan.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `,
  styles: `
    .chip {
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .chip--danger {
      background: #fee2e2;
      color: #991b1b;
    }
    .chip--warn {
      background: #fef3c7;
      color: #92400e;
    }
    .filters {
      display: flex;
      align-items: flex-end;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .filter {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--ag-ink-soft);
    }
    .filter input,
    .filter select {
      padding: 0.5rem 0.65rem;
      border-radius: 8px;
      border: 1px solid var(--ag-line);
      font: inherit;
      font-weight: 400;
      text-transform: none;
      background: #fff;
      min-width: 220px;
    }
    .filters__count {
      margin-left: auto;
      font-size: 0.8rem;
      color: var(--ag-ink-soft);
      padding-bottom: 0.5rem;
    }
    .table-wrap {
      overflow-x: auto;
    }
    .empty {
      text-align: center;
      padding: 1.5rem;
    }
  `,
})
export class DocumentsPage {
  private readonly store = inject(AdminGoStore);

  protected readonly statuses = DOCUMENT_STATUSES;
  protected readonly kpis = this.store.kpis;
  protected readonly search = signal('');
  protected readonly statusFilter = signal('all');

  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    return this.store.documents().filter((document) => {
      const matchesStatus =
        this.statusFilter() === 'all' || document.status === this.statusFilter();
      const matchesTerm =
        !term ||
        document.name.toLowerCase().includes(term) ||
        document.code.toLowerCase().includes(term) ||
        document.category.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  });

  protected readonly toneForStatus = toneForStatus;

  protected companyName(companyId: string): string {
    return this.store.companyById(companyId)?.name ?? '—';
  }

  protected operationCode(operationId: string | null): string {
    return this.store.operationById(operationId)?.code ?? '—';
  }

  protected remainingDays(expiresAt: string | null): string {
    const days = daysUntil(expiresAt);
    return days === null ? '—' : days < 0 ? `Venció (${Math.abs(days)})` : days.toString();
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected onStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }
}
