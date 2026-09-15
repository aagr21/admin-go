import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DOCUMENT_STATUSES, DocumentStatus } from '@core/models/enums';
import { AgDocument } from '@core/models/entities';
import { AdminGoStore } from '@core/services/admin-go.store';
import { StatusBadge } from '@shared/ui/status-badge';
import { formatDate } from '@shared/util/format';
import { toneForDocumentStatus } from '@shared/util/status';

/** Archivo elegido en el navegador, antes de registrarlo (§15). */
interface PickedFile {
  name: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Módulo Documentos — expedientes, carga, vencimientos, versiones y evidencias
 * (§15, §16).
 *
 * El contenido binario no se guarda en el navegador: se registra la referencia
 * del archivo y será el backend quien lo custodie (§29 «Gestión de archivos»).
 */
@Component({
  selector: 'app-documents-page',
  imports: [ReactiveFormsModule, StatusBadge],
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
          @if (canCreate) {
            <button class="ag-btn ag-btn--primary" type="button" (click)="startCreate()">
              Cargar documento
            </button>
          }
        </div>
      </header>

      @if (creating()) {
        <article class="ag-card">
          <p class="ag-card__title">Cargar documento</p>
          <p class="ag-card__sub">
            Se registra la referencia del archivo y queda como versión 1 del expediente.
          </p>
          <form class="form" [formGroup]="createForm" (ngSubmit)="submitCreate()">
            <label class="field field--wide">
              <span>Archivo (PDF o imagen)</span>
              <input type="file" accept="application/pdf,image/*" (change)="onFilePicked($event)" />
            </label>
            <label class="field">
              <span>Nombre del documento</span>
              <input type="text" formControlName="name" />
            </label>
            <label class="field">
              <span>Requisito / código</span>
              <select formControlName="code">
                @for (requirement of requirements(); track requirement.id) {
                  <option [value]="requirement.code">
                    {{ requirement.code }} · {{ requirement.name }}
                  </option>
                }
              </select>
            </label>
            <label class="field">
              <span>Categoría</span>
              <input type="text" formControlName="category" />
            </label>
            <label class="field">
              <span>Empresa</span>
              <select formControlName="companyId">
                @for (company of companies(); track company.id) {
                  <option [value]="company.id">{{ company.name }}</option>
                }
              </select>
            </label>
            <label class="field">
              <span>Operación asociada (opcional)</span>
              <select formControlName="operationId">
                <option value="">Sin operación</option>
                @for (operation of operations(); track operation.id) {
                  <option [value]="operation.id">{{ operation.code }}</option>
                }
              </select>
            </label>
            <label class="field">
              <span>Fecha de emisión</span>
              <input type="date" formControlName="issuedAt" />
            </label>
            <label class="field">
              <span>Vencimiento (opcional)</span>
              <input type="date" formControlName="expiresAt" />
            </label>
            <label class="field">
              <span>Responsable</span>
              <input type="text" formControlName="responsible" />
            </label>
            <label class="field field--wide">
              <span>Observaciones</span>
              <textarea formControlName="observation" rows="2"></textarea>
            </label>

            @if (formError(); as message) {
              <p class="alert" role="alert">{{ message }}</p>
            }

            <div class="ag-row form__actions">
              <button class="ag-btn ag-btn--primary" type="submit" [disabled]="busy()">
                Registrar documento
              </button>
              <button class="ag-btn" type="button" (click)="cancelCreate()">Cancelar</button>
            </div>
          </form>
        </article>
      }

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
          <table class="ag-table ag-table--stack">
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
                <th class="ag-num">v.</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (item of filtered(); track item.document.id) {
                <tr>
                  <td data-label="Código" class="ag-mono">{{ item.document.code }}</td>
                  <td data-label="Documento">{{ item.document.name }}</td>
                  <td data-label="Categoría">{{ item.document.category }}</td>
                  <td data-label="Empresa">{{ companyName(item.document.companyId) }}</td>
                  <td data-label="Operación" class="ag-mono">
                    {{ operationCode(item.document.operationId) }}
                  </td>
                  <td data-label="Emisión">{{ formatDate(item.document.issuedAt) }}</td>
                  <td data-label="Vencimiento">{{ formatDate(item.document.expiresAt) }}</td>
                  <td data-label="Días" class="ag-num">{{ remainingDays(item.days) }}</td>
                  <td data-label="v." class="ag-num">{{ item.currentVersion }}</td>
                  <td data-label="Estado">
                    <app-status-badge
                      [label]="item.status"
                      [tone]="toneForDocumentStatus(item.status)"
                    />
                  </td>
                  <td data-label="">
                    @if (canUpdate) {
                      <button class="ag-btn" type="button" (click)="startNewVersion(item.document)">
                        Nueva versión
                      </button>
                    }
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="11" class="ag-muted empty">Sin documentos que coincidan.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </article>

      @if (versioning(); as document) {
        <article class="ag-card">
          <p class="ag-card__title">Nueva versión · {{ document.name }}</p>
          <p class="ag-card__sub">
            Versión vigente: {{ document.versions.length }}. Cada carga conserva el historial
            anterior (§15).
          </p>

          <ul class="history">
            @for (version of document.versions; track version.version) {
              <li>
                <strong>v{{ version.version }}</strong>
                <span class="ag-mono">{{ version.fileName }}</span>
                <span class="ag-muted">
                  · {{ formatDate(version.uploadedAt) }} · {{ version.uploadedBy }} ·
                  {{ formatSize(version.sizeBytes) }}
                </span>
              </li>
            }
          </ul>

          <form class="form" [formGroup]="versionForm" (ngSubmit)="submitVersion()">
            <label class="field field--wide">
              <span>Archivo de la nueva versión</span>
              <input
                type="file"
                accept="application/pdf,image/*"
                (change)="onVersionFilePicked($event)"
              />
            </label>
            <label class="field field--wide">
              <span>Nota del cambio</span>
              <input type="text" formControlName="note" />
            </label>
            <div class="ag-row form__actions">
              <button class="ag-btn ag-btn--primary" type="submit" [disabled]="busy()">
                Registrar versión
              </button>
              <button class="ag-btn" type="button" (click)="cancelVersion()">Cancelar</button>
            </div>
          </form>
        </article>
      }
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

    .chip {
      padding: 0.2rem 0.6rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
    }
    .chip--danger {
      background: var(--ag-danger-bg);
      color: var(--ag-danger-ink);
    }
    .chip--warn {
      background: var(--ag-warn-bg);
      color: var(--ag-warn-ink);
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
      border-radius: var(--ag-radius-sm);
      border: 1px solid var(--ag-line);
      font: inherit;
      font-weight: 400;
      text-transform: none;
      background: var(--ag-surface);
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

    .form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
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
    .field select,
    .field textarea {
      padding: 0.5rem 0.65rem;
      border-radius: var(--ag-radius-sm);
      border: 1px solid var(--ag-line);
      font: inherit;
      font-weight: 400;
      text-transform: none;
      color: var(--ag-ink);
      background: var(--ag-surface);
    }

    .field--wide {
      grid-column: 1 / -1;
    }

    .form__actions {
      grid-column: 1 / -1;
      gap: 0.6rem;
      align-items: center;
    }

    .alert {
      grid-column: 1 / -1;
      margin: 0;
      padding: 0.5rem 0.75rem;
      border-radius: var(--ag-radius-sm);
      background: var(--ag-warn-bg);
      color: var(--ag-warn-ink);
      font-size: 0.82rem;
    }

    .history {
      margin: 0.85rem 0 0;
      padding-left: 1.1rem;
      display: grid;
      gap: 0.35rem;
      font-size: 0.82rem;
    }

    .ag-card + .ag-card {
      margin-top: 1.25rem;
    }
  `,
})
export class DocumentsPage {
  private readonly store = inject(AdminGoStore);
  private readonly forms = inject(FormBuilder);

  protected readonly statuses = DOCUMENT_STATUSES;
  protected readonly kpis = this.store.kpis;
  protected readonly requirements = this.store.requirements;
  protected readonly companies = this.store.companies;
  protected readonly operations = this.store.operations;
  protected readonly busy = this.store.busy;
  protected readonly canCreate = this.store.can('create');
  protected readonly canUpdate = this.store.can('update');
  protected readonly formatDate = formatDate;
  protected readonly toneForDocumentStatus = toneForDocumentStatus;

  protected readonly search = signal('');
  protected readonly statusFilter = signal<DocumentStatus | 'all'>('all');
  protected readonly creating = signal(false);
  protected readonly versioning = signal<AgDocument | null>(null);
  protected readonly formError = signal<string | null>(null);

  private readonly pickedFile = signal<PickedFile | null>(null);

  /** Documentos ya clasificados por la regla única del §15. */
  protected readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.store.classifiedDocuments().filter(({ document, status: derived }) => {
      const matchesStatus = status === 'all' || derived === status;
      const matchesTerm =
        !term ||
        document.name.toLowerCase().includes(term) ||
        document.code.toLowerCase().includes(term) ||
        document.category.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  });

  protected readonly createForm = this.forms.nonNullable.group({
    name: ['', Validators.required],
    code: ['', Validators.required],
    category: ['Regulatorio', Validators.required],
    companyId: ['', Validators.required],
    operationId: [''],
    issuedAt: ['', Validators.required],
    expiresAt: [''],
    responsible: ['', Validators.required],
    observation: [''],
  });

  protected readonly versionForm = this.forms.nonNullable.group({
    note: [''],
  });

  protected startCreate(): void {
    this.pickedFile.set(null);
    this.formError.set(null);
    this.createForm.reset({
      name: '',
      code: this.requirements()[0]?.code ?? '',
      category: 'Regulatorio',
      companyId: this.companies()[0]?.id ?? '',
      operationId: '',
      issuedAt: '',
      expiresAt: '',
      responsible: '',
      observation: '',
    });
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
    this.pickedFile.set(null);
  }

  protected onFilePicked(event: Event): void {
    this.pickedFile.set(this.readFile(event));
  }

  protected onVersionFilePicked(event: Event): void {
    this.pickedFile.set(this.readFile(event));
  }

  protected async submitCreate(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const file = this.pickedFile();
    if (!file) {
      this.formError.set('Selecciona el archivo que respalda el documento.');
      return;
    }
    const value = this.createForm.getRawValue();
    this.formError.set(null);
    await this.store.createDocument({
      ...value,
      stationId: null,
      operationId: value.operationId === '' ? null : value.operationId,
      expiresAt: value.expiresAt === '' ? null : value.expiresAt,
      observation: value.observation.trim() === '' ? null : value.observation.trim(),
      fileName: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      uploadedBy: this.currentUserName(),
    });
    this.creating.set(false);
    this.pickedFile.set(null);
  }

  protected startNewVersion(document: AgDocument): void {
    this.pickedFile.set(null);
    this.formError.set(null);
    this.versionForm.reset({ note: '' });
    this.versioning.set(document);
  }

  protected cancelVersion(): void {
    this.versioning.set(null);
    this.pickedFile.set(null);
  }

  protected async submitVersion(): Promise<void> {
    const document = this.versioning();
    if (!document) {
      return;
    }
    const file = this.pickedFile();
    if (!file) {
      this.formError.set('Selecciona el archivo de la nueva versión.');
      return;
    }
    const note = this.versionForm.getRawValue().note.trim();
    this.formError.set(null);
    await this.store.addDocumentVersion(document.id, {
      fileName: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      note: note === '' ? null : note,
      uploadedBy: this.currentUserName(),
    });
    // Se refresca la referencia local con el expediente ya actualizado.
    this.versioning.set(this.store.documentById(document.id) ?? null);
    this.pickedFile.set(null);
    this.versionForm.reset({ note: '' });
  }

  protected companyName(companyId: string): string {
    return this.store.companyById(companyId)?.name ?? '—';
  }

  protected operationCode(operationId: string | null): string {
    return this.store.operationById(operationId)?.code ?? '—';
  }

  protected remainingDays(days: number | null): string {
    return days === null ? '—' : days < 0 ? `Venció (${Math.abs(days)})` : days.toString();
  }

  protected formatSize(bytes: number): string {
    return bytes >= 1_048_576
      ? `${(bytes / 1_048_576).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  /** El `<select>` solo ofrece `all` o un estado del catálogo (ver plantilla). */
  protected onStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value as DocumentStatus | 'all');
  }

  private readFile(event: Event): PickedFile | null {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return null;
    }
    return {
      name: file.name,
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    };
  }

  private currentUserName(): string {
    return this.store.currentUserName();
  }
}
