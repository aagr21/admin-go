import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AdminGoStore } from '@core/services/admin-go.store';
import { ReportData, ReportExportService } from '@shared/services/report-export.service';
import { REPORT_DEFS, ReportOptions } from './report-builders';

/** Módulo Reportes — exportación PDF y Excel del catálogo (§26). */
@Component({
  selector: 'app-reports-page',
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Reportes</h1>
          <p class="ag-page__sub">
            Exportación en PDF y Excel de la operación documentada. Cada generación queda registrada
            en auditoría (§27).
          </p>
        </div>
      </header>

      <div class="reports">
        @for (definition of defs; track definition.id) {
          <article class="ag-card report">
            <div class="report__info">
              <p class="ag-card__title">{{ definition.title }}</p>
              <p class="ag-card__sub">{{ definition.description }}</p>
            </div>
            <div class="ag-row">
              @if (busy() === definition.id) {
                <span class="report__busy">Generando…</span>
              }
              @for (format of definition.formats; track format) {
                <button
                  class="ag-btn"
                  type="button"
                  [disabled]="busy() !== null"
                  (click)="onExport(definition.id, format)"
                >
                  {{ format === 'pdf' ? 'PDF' : 'Excel' }}
                </button>
              }
            </div>
          </article>
        }
      </div>
      <article class="ag-card">
        <p class="ag-card__title">Notas de generación</p>
        <p class="ag-card__sub">
          Los archivos se generan en el navegador y su nombre incluye la fecha real de descarga
          (AG-&lt;reporte&gt;-&lt;fecha&gt;). El reporte de diferencias volumétricas aplica el
          umbral configurado en Configuración (§14) y los vencimientos documentales usan los días de
          aviso definidos allí.
        </p>
      </article>
    </section>
  `,
  styles: `
    .reports {
      display: grid;
      gap: 0.9rem;
    }

    .report {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.9rem 1.1rem;
    }

    .report__info {
      min-width: 0;
    }

    .report__busy {
      font-size: 0.78rem;
      color: var(--ag-ink-soft);
    }

    .ag-card + .ag-card {
      margin-top: 1.25rem;
    }

    @media (max-width: 720px) {
      .report {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage {
  private readonly store = inject(AdminGoStore);
  private readonly exporter = inject(ReportExportService);

  protected readonly defs = REPORT_DEFS;
  /** id del reporte en generación; null cuando la UI está libre. */
  protected readonly busy = signal<string | null>(null);

  private get options(): ReportOptions {
    return {
      thresholdPercent: this.store.maxVolumeDifferencePercent(),
      warningDays: this.store.documentWarningDays(),
    };
  }

  protected async onExport(id: string, format: 'pdf' | 'xlsx'): Promise<void> {
    const definition = this.defs.find((item) => item.id === id);
    if (!definition || this.busy() !== null) {
      return;
    }
    this.busy.set(definition.id);
    try {
      const report: ReportData = definition.build(this.store, this.options);
      if (format === 'pdf') {
        await this.exporter.exportPdf(report);
      } else {
        await this.exporter.exportXlsx(report);
      }
      await this.store.logReportGenerated(report.slug, format);
    } finally {
      this.busy.set(null);
    }
  }
}
