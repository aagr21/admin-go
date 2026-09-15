import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminGoStore } from '@core/services/admin-go.store';
import { Requirement } from '@core/models/entities';
import { CoverageCell, CoverageStatus, buildComplianceMatrix } from '@core/rules/compliance-matrix';
import { StatusBadge } from '@shared/ui/status-badge';
import { Tone, formatDate } from '@shared/util/format';
import { toneForDocumentStatus } from '@shared/util/status';

/**
 * Matriz de cumplimiento (§16): REQUISITO → DOCUMENTO → ESTADO → EVIDENCIA →
 * RESPONSABLE → FECHA, configurable por tipo de cliente y actividad.
 */
@Component({
  selector: 'app-compliance-page',
  imports: [ReactiveFormsModule, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Matriz de cumplimiento</h1>
          <p class="ag-page__sub">
            Cada requisito cruzado con cada tipo de cliente: estado, respaldo, responsable y
            vencimiento (§16).
          </p>
        </div>
        @if (canConfigure) {
          <button class="ag-btn ag-btn--primary" type="button" (click)="startCreate()">
            Nuevo requisito
          </button>
        }
      </header>

      @if (creating()) {
        <article class="ag-card">
          <p class="ag-card__title">Nuevo requisito</p>
          <form class="form" [formGroup]="createForm" (ngSubmit)="submitCreate()">
            <label class="field">
              <span>Código</span>
              <input type="text" formControlName="code" placeholder="REQ-XXX-00" />
            </label>
            <label class="field">
              <span>Nombre</span>
              <input type="text" formControlName="name" />
            </label>
            <label class="field">
              <span>Aplica a</span>
              <select formControlName="appliesTo">
                @for (scope of scopes; track scope) {
                  <option [value]="scope">{{ scope }}</option>
                }
              </select>
            </label>
            <label class="field">
              <span>Vigencia (días)</span>
              <input type="number" formControlName="validityDays" min="1" />
            </label>
            <label class="check">
              <input type="checkbox" formControlName="mandatory" />
              <span>Obligatorio</span>
            </label>
            <div class="ag-row form__actions">
              <button class="ag-btn ag-btn--primary" type="submit" [disabled]="busy()">
                Crear requisito
              </button>
              <button class="ag-btn" type="button" (click)="cancelCreate()">Cancelar</button>
            </div>
          </form>
        </article>
      }

      <div class="summary">
        @for (item of summary(); track item.status) {
          <article class="ag-card summary__item">
            <p class="summary__label">{{ item.status }}</p>
            <p class="summary__value">{{ item.count }}</p>
          </article>
        }
      </div>

      <article class="ag-card">
        <p class="ag-card__title">Matriz requisito × cliente</p>
        <p class="ag-card__sub">
          Una celda «No aplica» significa que el tipo de cliente de esa empresa queda fuera del
          alcance del requisito.
        </p>
        <div class="table-wrap">
          <table class="ag-table ag-table--matrix">
            <thead>
              <tr>
                <th>Requisito</th>
                <th>Aplica a</th>
                <th>Oblig.</th>
                <th class="ag-num">Vigencia</th>
                @for (company of companies(); track company.id) {
                  <th>{{ company.name }}</th>
                }
                @if (canConfigure) {
                  <th></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (requirement of requirements(); track requirement.id) {
                <tr [class.row--inactive]="!requirement.active">
                  <td>
                    <span class="ag-mono">{{ requirement.code }}</span>
                    <br />
                    <span class="ag-muted">{{ requirement.name }}</span>
                  </td>
                  <td>{{ requirement.appliesTo }}</td>
                  <td>{{ requirement.mandatory ? 'Sí' : 'No' }}</td>
                  <td class="ag-num">{{ requirement.validityDays }}</td>
                  @for (company of companies(); track company.id) {
                    <td>
                      @if (cellFor(requirement, company.id); as cell) {
                        <app-status-badge
                          [label]="cell.status"
                          [tone]="toneForCoverage(cell.status)"
                          [attr.title]="cellDetail(cell)"
                        />
                      }
                    </td>
                  }
                  @if (canConfigure) {
                    <td>
                      <button class="ag-btn" type="button" (click)="toggleActive(requirement)">
                        {{ requirement.active ? 'Retirar' : 'Reactivar' }}
                      </button>
                    </td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `,
  styles: `
    .ag-page__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.75rem;
    }

    .summary__item {
      padding: 0.7rem 0.9rem;
    }

    .summary__label {
      margin: 0;
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ag-ink-soft);
    }

    .summary__value {
      margin: 0.25rem 0 0;
      font-size: 1.3rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }

    .form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 0.85rem;
      margin-top: 0.85rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--ag-ink-soft);
    }

    .field input,
    .field select {
      padding: 0.5rem 0.65rem;
      border-radius: var(--ag-radius-sm);
      border: 1px solid var(--ag-line);
      font: inherit;
      font-weight: 400;
      text-transform: none;
      color: var(--ag-ink);
      background: var(--ag-surface);
    }

    .check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.82rem;
      color: var(--ag-ink-soft);
    }

    .form__actions {
      grid-column: 1 / -1;
      gap: 0.6rem;
      align-items: center;
    }

    .table-wrap {
      overflow-x: auto;
      margin-top: 0.85rem;
    }

    .row--inactive {
      opacity: 0.55;
    }

    .ag-card + .ag-card,
    .summary + .ag-card {
      margin-top: 1.25rem;
    }
  `,
})
export class CompliancePage {
  private readonly store = inject(AdminGoStore);
  private readonly forms = inject(FormBuilder);

  protected readonly scopes: Requirement['appliesTo'][] = [
    'cliente',
    'actividad',
    'vehículo',
    'instalación',
  ];

  protected readonly requirements = this.store.requirements;
  protected readonly companies = this.store.companies;
  protected readonly busy = this.store.busy;
  protected readonly canConfigure = this.store.can('configure');

  protected readonly creating = signal(false);

  protected readonly createForm = this.forms.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^REQ-[A-Z]{3}-\d{2}$/)]],
    name: ['', Validators.required],
    appliesTo: ['cliente' as Requirement['appliesTo'], Validators.required],
    validityDays: [365, [Validators.required, Validators.min(1)]],
    mandatory: [true],
  });

  /** Celdas de la matriz, ya resueltas con la regla del §16. */
  private readonly cells = computed(() =>
    buildComplianceMatrix(
      this.requirements(),
      this.companies(),
      this.store.documents(),
      this.store.documentWarningDays(),
      this.store.referenceDate,
    ),
  );

  protected readonly summary = computed(() => {
    const counts = new Map<CoverageStatus, number>();
    for (const cell of this.cells()) {
      counts.set(cell.status, (counts.get(cell.status) ?? 0) + 1);
    }
    return [...counts.entries()].map(([status, count]) => ({ status, count }));
  });

  protected cellFor(requirement: Requirement, companyId: string): CoverageCell | undefined {
    return this.cells().find(
      (cell) => cell.requirement.id === requirement.id && cell.company.id === companyId,
    );
  }

  protected toneForCoverage(status: CoverageStatus): Tone {
    return status === 'No aplica' ? 'neutral' : toneForDocumentStatus(status);
  }

  protected cellDetail(cell: CoverageCell): string {
    if (cell.status === 'No aplica') {
      return 'El requisito no aplica al tipo de cliente de esta empresa.';
    }
    if (cell.documents.length === 0) {
      return 'Requisito sin documento de respaldo.';
    }
    const expiry = cell.expiresAt ? ` · vence ${formatDate(cell.expiresAt)}` : '';
    return `${cell.documents.length} documento(s) · responsable ${cell.responsible ?? '—'}${expiry}`;
  }

  protected startCreate(): void {
    this.createForm.reset({
      code: '',
      name: '',
      appliesTo: 'cliente',
      validityDays: 365,
      mandatory: true,
    });
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
  }

  protected async submitCreate(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    await this.store.createRequirement({
      ...this.createForm.getRawValue(),
      clientKinds: [],
      active: true,
    });
    this.creating.set(false);
  }

  protected async toggleActive(requirement: Requirement): Promise<void> {
    await this.store.updateRequirement(requirement.id, { active: !requirement.active });
  }
}
