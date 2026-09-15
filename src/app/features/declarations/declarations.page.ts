import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminGoStore } from '@core/services/admin-go.store';
import { Declaration } from '@core/models/entities';
import { ValidationFinding } from '@core/rules/validation';
import { StatusBadge } from '@shared/ui/status-badge';
import { Tone, formatDate, formatLiters } from '@shared/util/format';
import {
  labelForComplianceLevel,
  toneForComplianceLevel,
  toneForDeclarationStatus,
} from '@shared/util/status';

/**
 * Módulo Declaraciones — consolidación, validación previa y planillas (§17, §18).
 *
 * El CHECK ADMIN GO se calcula en vivo con el motor de reglas: al seleccionar
 * una declaración se ven los hallazgos reales, no un campo guardado a mano.
 */
@Component({
  selector: 'app-declarations-page',
  imports: [StatusBadge, RouterLink],
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
        <div class="table-wrap">
          <table class="ag-table ag-table--stack">
            <thead>
              <tr>
                <th>Declaración</th>
                <th>Periodo</th>
                <th class="ag-num">Operaciones</th>
                <th class="ag-num">Documentos</th>
                <th class="ag-num">Volumen</th>
                <th class="ag-num">Inventario cierre</th>
                <th class="ag-num">Ajustes</th>
                <th class="ag-num">v.</th>
                <th>Validación</th>
                <th>Estado</th>
                <th>Presentada</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (declaration of declarations(); track declaration.id) {
                <tr [class.row--active]="selectedId() === declaration.id">
                  <td data-label="Declaración" class="ag-mono">{{ declaration.code }}</td>
                  <td data-label="Periodo">{{ declaration.period }}</td>
                  <td data-label="Operaciones" class="ag-num">
                    {{ declaration.operationIds.length }}
                  </td>
                  <td data-label="Documentos" class="ag-num">
                    {{ declaration.documentIds.length }}
                  </td>
                  <td data-label="Volumen" class="ag-num">
                    {{ formatLiters(declaration.totalVolume) }}
                  </td>
                  <td data-label="Inventario cierre" class="ag-num">
                    {{ formatLiters(declaration.closingInventory) }}
                  </td>
                  <td data-label="Ajustes" class="ag-num">
                    {{ formatLiters(declaration.adjustments) }}
                  </td>
                  <td data-label="v." class="ag-num">{{ declaration.version }}</td>
                  <td data-label="Validación">
                    <app-status-badge
                      [label]="labelForComplianceLevel(declaration.validation)"
                      [tone]="toneForComplianceLevel(declaration.validation)"
                    />
                  </td>
                  <td data-label="Estado">
                    <app-status-badge
                      [label]="declaration.status"
                      [tone]="toneForDeclarationStatus(declaration.status)"
                    />
                  </td>
                  <td data-label="Presentada">{{ declaration.presentedAt ? 'Sí' : 'No' }}</td>
                  <td data-label="">
                    <button class="ag-btn" type="button" (click)="select(declaration)">
                      Ver CHECK
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </article>

      @if (selected(); as declaration) {
        <article class="ag-card">
          <header class="ag-card__head">
            <div>
              <p class="ag-card__title">CHECK ADMIN GO · {{ declaration.code }}</p>
              <p class="ag-card__sub">
                Validación previa sobre {{ declaration.operationIds.length }} operaciones y
                {{ declaration.documentIds.length }} documentos (§18).
              </p>
            </div>
            <app-status-badge
              [label]="labelForComplianceLevel(liveLevel())"
              [tone]="toneForComplianceLevel(liveLevel())"
            />
          </header>

          @if (findings().length === 0) {
            <p class="ok-note" role="status">
              Sin hallazgos: la declaración supera todas las validaciones del §18.
            </p>
          } @else {
            <ul class="findings">
              @for (finding of findings(); track finding.code + finding.title) {
                <li [class]="'finding finding--' + finding.level">
                  <div class="finding__head">
                    <app-status-badge
                      [label]="findingTitle(finding)"
                      [tone]="toneForFinding(finding)"
                    />
                    <span class="ag-mono ag-muted">{{ finding.code }}</span>
                  </div>
                  <p class="finding__detail">{{ finding.detail }}</p>
                </li>
              }
            </ul>
          }

          <section class="block">
            <h3>Operaciones consolidadas ({{ declarationOperations().length }})</h3>
            @if (declarationOperations().length === 0) {
              <p class="ag-muted">No hay operaciones asociadas al periodo.</p>
            } @else {
              <ul class="list">
                @for (operation of declarationOperations(); track operation.id) {
                  <li>
                    <a class="ag-mono link" [routerLink]="['/operations', operation.code]">
                      {{ operation.code }}
                    </a>
                    <span class="ag-muted">
                      · {{ operation.type }} · {{ formatLiters(operation.documentedVolume) }} ·
                      {{ operation.status }}
                    </span>
                  </li>
                }
              </ul>
            }
          </section>

          <section class="block">
            <h3>Documentos de respaldo ({{ declarationDocuments().length }})</h3>
            @if (declarationDocuments().length === 0) {
              <p class="ag-muted">Sin documentos asociados.</p>
            } @else {
              <ul class="list">
                @for (document of declarationDocuments(); track document.id) {
                  <li>
                    <span class="ag-mono">{{ document.code }}</span>
                    <span class="ag-muted">
                      · {{ document.name }} · vence {{ formatDate(document.expiresAt) }}
                    </span>
                  </li>
                }
              </ul>
            }
          </section>

          @if (canValidate) {
            <div class="ag-row actions">
              <button
                class="ag-btn ag-btn--primary"
                type="button"
                (click)="runCheck(declaration)"
                [disabled]="busy()"
              >
                Ejecutar CHECK ADMIN GO
              </button>
              <span class="ag-muted">
                Guarda el resultado en la declaración y lo registra en auditoría (§27).
              </span>
            </div>
          }
        </article>
      }

      <p class="ag-muted">
        La presentación se realiza por los mecanismos y sujetos autorizados que correspondan (§17).
      </p>
    </section>
  `,
  styles: `
    .table-wrap {
      overflow-x: auto;
    }

    .row--active {
      background: var(--ag-primary-050);
    }

    .findings {
      list-style: none;
      margin: 0.85rem 0 0;
      padding: 0;
      display: grid;
      gap: 0.6rem;
    }

    .finding {
      padding: 0.6rem 0.75rem;
      border-radius: var(--ag-radius-sm);
      border: 1px solid var(--ag-line);
      background: var(--ag-neutral-bg);
    }

    .finding--critical {
      background: var(--ag-danger-bg);
      border-color: var(--ag-danger-line);
    }

    .finding--observed {
      background: var(--ag-warn-bg);
      border-color: var(--ag-warn-line);
    }

    .finding__head {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .finding__detail {
      margin: 0.35rem 0 0;
      font-size: 0.82rem;
      color: var(--ag-ink-soft);
    }

    .ok-note {
      margin: 0.85rem 0 0;
      padding: 0.6rem 0.75rem;
      border-radius: var(--ag-radius-sm);
      background: var(--ag-ok-bg);
      color: var(--ag-ok-ink);
      font-size: 0.85rem;
    }

    .block {
      margin-top: 1.25rem;
      border-top: 1px solid var(--ag-line);
      padding-top: 0.85rem;
    }

    .block h3 {
      margin: 0 0 0.4rem;
      font-size: 0.85rem;
    }

    .list {
      margin: 0;
      padding-left: 1.1rem;
      display: grid;
      gap: 0.3rem;
      font-size: 0.82rem;
    }

    .link {
      color: var(--ag-primary-600);
      font-weight: 600;
    }

    .actions {
      align-items: center;
      gap: 0.75rem;
      margin-top: 1.1rem;
      flex-wrap: wrap;
    }

    .ag-card + .ag-card {
      margin-top: 1.25rem;
    }
  `,
})
export class DeclarationsPage {
  private readonly store = inject(AdminGoStore);

  protected readonly declarations = this.store.declarations;
  protected readonly formatLiters = formatLiters;
  protected readonly formatDate = formatDate;
  protected readonly labelForComplianceLevel = labelForComplianceLevel;
  protected readonly toneForComplianceLevel = toneForComplianceLevel;
  protected readonly toneForDeclarationStatus = toneForDeclarationStatus;
  protected readonly busy = this.store.busy;
  protected readonly canValidate = this.store.can('validate');

  protected readonly selectedId = signal<string | null>(null);

  protected readonly selected = computed<Declaration | null>(() => {
    const id = this.selectedId();
    return id === null ? null : (this.declarations().find((item) => item.id === id) ?? null);
  });

  /** Hallazgos calculados con las reglas puras del §18. */
  protected readonly findings = computed<ValidationFinding[]>(() => {
    const declaration = this.selected();
    return declaration ? this.store.declarationFindings(declaration) : [];
  });

  /** Nivel CHECK resultante de los hallazgos actuales. */
  protected readonly liveLevel = computed(() =>
    this.findings().some((finding) => finding.level === 'critical')
      ? ('critical' as const)
      : this.findings().length > 0
        ? ('observed' as const)
        : ('ok' as const),
  );

  protected readonly declarationOperations = computed(() => {
    const declaration = this.selected();
    return declaration
      ? this.store
          .operations()
          .filter((operation) => declaration.operationIds.includes(operation.id))
      : [];
  });

  protected readonly declarationDocuments = computed(() => {
    const declaration = this.selected();
    return declaration
      ? this.store.documents().filter((document) => declaration.documentIds.includes(document.id))
      : [];
  });

  protected select(declaration: Declaration): void {
    this.selectedId.set(declaration.id);
  }

  protected findingTitle(finding: ValidationFinding): string {
    return finding.level === 'critical' ? 'Crítico' : 'Observado';
  }

  protected toneForFinding(finding: ValidationFinding): Tone {
    return finding.level === 'critical' ? 'danger' : 'warn';
  }

  protected async runCheck(declaration: Declaration): Promise<void> {
    await this.store.validateDeclaration(declaration.id);
  }
}
