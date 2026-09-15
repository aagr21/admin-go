import { computed, inject, Injectable, signal } from '@angular/core';
import { AdminGoApi, AdminGoApiError, AdminGoDataset, RuleConfig } from '@core/api/admin-go.api';
import { AuthStore } from '@core/auth/auth.store';
import { Action, canPerform } from '@core/auth/permissions';
import { TenantScope, scopedToCompany, tenantScopeOf } from '@core/auth/tenant';
import { datasetDate } from '@core/data/dataset-date';
import { readStoredRuleConfig, writeStoredRuleConfig } from '@core/data/settings-persistence';
import {
  AgDocument,
  Alert,
  Company,
  ControlTowerKpis,
  Declaration,
  Driver,
  Evidence,
  Incident,
  Operation,
  OperationalControl,
  Plant,
  Requirement,
  Station,
  Tank,
  User,
} from '@core/models/entities';
import { AlertStatus } from '@core/models/enums';
import { classifyDocuments } from '@core/rules/document-status';
import {
  DeclarationValidationInput,
  ValidationFinding,
  complianceLevelOf,
  validateDeclaration,
} from '@core/rules/validation';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Estado central de la Torre de Control (§8).
 *
 * Todo dato entra por `AdminGoApi`: el store no conoce el dataset de
 * demostración, así que sustituir la implementación por la HTTP no le afecta.
 *
 * Dos responsabilidades transversales viven aquí:
 * - **Ámbito multiempresa** (§29): las vistas públicas ya vienen acotadas a la
 *   empresa del usuario.
 * - **Auditoría** (§27): cada escritura registra el cambio campo a campo.
 */
@Injectable({ providedIn: 'root' })
export class AdminGoStore {
  private readonly api = inject(AdminGoApi);
  private readonly auth = inject(AuthStore);

  private readonly dataset = signal<AdminGoDataset | null>(null);
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  /** `true` mientras hay una escritura en curso: la UI bloquea acciones. */
  readonly busy = signal(false);
  readonly ready = computed(() => this.status() === 'ready');

  /** Parámetros configurables de la plataforma (§14), rehidratados al arrancar. */
  /** Última configuración persistida: base para auditar solo lo que cambió. */
  private storedConfig = readStoredRuleConfig();
  readonly maxVolumeDifferencePercent = signal<number>(this.storedConfig.thresholdPercent);
  readonly documentWarningDays = signal<number>(this.storedConfig.warningDays);
  readonly stalledOperationDays = signal<number>(this.storedConfig.stalledOperationDays);

  /** Configuración consolidada que consumen reglas y reportes. */
  readonly settings = computed<RuleConfig>(() => ({
    warningDays: this.documentWarningDays(),
    thresholdPercent: this.maxVolumeDifferencePercent(),
    stalledOperationDays: this.stalledOperationDays(),
  }));

  /** Fecha de corte vigente (la del dataset mientras no haya backend). */
  readonly referenceDate = datasetDate();

  // ── Ámbito ─────────────────────────────────────────────────────────
  readonly scope = computed<TenantScope>(() => tenantScopeOf(this.auth.currentUser()));

  /** Nombre del usuario en sesión, para responsabilidades y auditoría (§27). */
  readonly currentUserName = computed(() => this.auth.currentUser()?.fullName ?? 'sistema');

  /** Indica si el usuario puede ejecutar una acción (§6). */
  can(action: Action): boolean {
    return canPerform(this.auth.currentUser()?.role ?? null, action);
  }

  // ── Colecciones ────────────────────────────────────────────────────
  private readonly companiesRaw = computed(() => this.dataset()?.companies ?? []);
  private readonly stationsRaw = computed(() => this.dataset()?.stations ?? []);
  private readonly tanksRaw = computed(() => this.dataset()?.tanks ?? []);
  private readonly cisternsRaw = computed(() => this.dataset()?.cisterns ?? []);
  private readonly driversRaw = computed(() => this.dataset()?.drivers ?? []);
  private readonly usersRaw = computed(() => this.dataset()?.users ?? []);
  private readonly operationsRaw = computed(() => this.dataset()?.operations ?? []);
  private readonly documentsRaw = computed(() => this.dataset()?.documents ?? []);
  private readonly declarationsRaw = computed(() => this.dataset()?.declarations ?? []);

  /** Catálogos globales de la plataforma: iguales para todos los clientes. */
  readonly products = computed(() => this.dataset()?.products ?? []);
  readonly plants = computed(() => this.dataset()?.plants ?? []);
  readonly requirements = computed(() => this.dataset()?.requirements ?? []);
  readonly evidences = computed(() => this.dataset()?.evidences ?? []);
  readonly alerts = computed(() => this.dataset()?.alerts ?? []);
  readonly incidents = computed(() => this.dataset()?.incidents ?? []);
  readonly qualityControls = computed(() => this.dataset()?.qualityControls ?? []);
  readonly operationalControls = computed(() => this.dataset()?.operationalControls ?? []);
  readonly auditLogs = computed(() => this.dataset()?.auditLogs ?? []);
  readonly volumes = computed(() => this.dataset()?.volumes ?? []);
  readonly inventoryMovements = computed(() => this.dataset()?.inventoryMovements ?? []);
  readonly tankMeasurements = computed(() => this.dataset()?.tankMeasurements ?? []);

  // ── Colecciones acotadas por empresa (§29) ─────────────────────────
  /** La empresa se acota por su propio `id`: es la entidad, no una referencia. */
  readonly companies = computed(() => {
    const scope = this.scope();
    if (scope.global) {
      return this.companiesRaw();
    }
    return this.companiesRaw().filter((company) => company.id === scope.companyId);
  });
  readonly stations = computed(() => scopedToCompany(this.stationsRaw(), this.scope()));
  readonly cisterns = computed(() => scopedToCompany(this.cisternsRaw(), this.scope()));
  readonly drivers = computed(() => scopedToCompany(this.driversRaw(), this.scope()));
  readonly users = computed(() => scopedToCompany(this.usersRaw(), this.scope()));
  readonly operations = computed(() => scopedToCompany(this.operationsRaw(), this.scope()));
  readonly documents = computed(() => scopedToCompany(this.documentsRaw(), this.scope()));
  readonly declarations = computed(() => scopedToCompany(this.declarationsRaw(), this.scope()));

  /** Tanques visibles: los de las instalaciones a las que se tiene acceso. */
  readonly tanks = computed(() => {
    const scope = this.scope();
    if (scope.global) {
      return this.tanksRaw();
    }
    const visible = new Set(this.stations().map((station) => station.id));
    return this.tanksRaw().filter((tank) => visible.has(tank.stationId));
  });

  // ── Indicadores (§8) ───────────────────────────────────────────────
  /**
   * Documentos clasificados con la regla única del §15. El Dashboard, el módulo
   * documental y los reportes comparten este cálculo: antes el KPI leía el
   * estado almacenado y el reporte lo recalculaba, y podían discrepar.
   */
  readonly classifiedDocuments = computed(() =>
    classifyDocuments(this.documents(), this.documentWarningDays(), this.referenceDate),
  );

  readonly kpis = computed<ControlTowerKpis>(() => {
    const plants = this.plants();
    const receivedVolume = sum(plants, (p) => p.receivedToday);
    const dispatchedVolume = sum(plants, (p) => p.dispatchedToday);
    const theoreticalInventory = sum(plants, (p) => p.theoreticalBalance);
    const physicalInventory = sum(plants, (p) => p.physicalBalance);
    const volumeDifference = physicalInventory - theoreticalInventory;
    const operations = this.operations();
    const classified = this.classifiedDocuments();
    const alerts = this.alerts();
    const declarations = this.declarations();
    const adminScore = plants.length
      ? Math.round(sum(plants, (p) => p.adminScore) / plants.length)
      : 0;

    return {
      plantsTotal: plants.length,
      plantsGreen: plants.filter((p) => p.status === 'green').length,
      plantsYellow: plants.filter((p) => p.status === 'yellow').length,
      plantsRed: plants.filter((p) => p.status === 'red').length,
      receivedVolume,
      dispatchedVolume,
      theoreticalInventory,
      physicalInventory,
      volumeDifference,
      volumeDifferencePercent: theoreticalInventory
        ? (volumeDifference / theoreticalInventory) * 100
        : 0,
      openOperations: operations.filter(
        (o) => o.status === 'Programada' || o.status === 'En tránsito' || o.status === 'Recibida',
      ).length,
      observedOperations: operations.filter((o) => o.status === 'Observada').length,
      documentsExpiringSoon: classified.filter((item) => item.status === 'Próximo a vencer').length,
      documentsExpired: classified.filter((item) => item.status === 'Vencido').length,
      pendingDeclarations: declarations.filter((d) => d.status !== 'Presentada').length,
      criticalAlerts: alerts.filter((a) => a.severity === 'critical' && a.status !== 'Atendida')
        .length,
      openIncidents: this.incidents().filter((i) => i.status !== 'Cerrada').length,
      adminScore,
    };
  });

  /** Plantas ordenadas de mayor a menor criticidad para el semáforo (§8). */
  readonly plantsBySeverity = computed(() =>
    [...this.plants()].sort(
      (a, b) => statusWeight(a.status) - statusWeight(b.status) || a.adminScore - b.adminScore,
    ),
  );

  readonly criticalAlerts = computed(() =>
    this.alerts().filter((a) => a.severity === 'critical' && a.status !== 'Atendida'),
  );

  /** Controles operativos pendientes de cierre (§10, §11). */
  readonly openControls = computed(() =>
    this.operationalControls().filter((control) => control.status !== 'Cerrado'),
  );

  // ── Carga ──────────────────────────────────────────────────────────
  /** Carga inicial. Se invoca desde `provideAppInitializer` (§29 estados). */
  async load(): Promise<void> {
    this.status.set('loading');
    this.error.set(null);
    try {
      this.dataset.set(await this.api.bootstrap(this.settings()));
      this.status.set('ready');
    } catch (error) {
      this.error.set(describeError(error));
      this.status.set('error');
    }
  }

  /**
   * Reejecuta la carga tras una escritura. Garantiza que las vistas y las
   * alertas derivadas queden coherentes con el estado del "servidor".
   */
  private async sync(): Promise<void> {
    this.dataset.set(await this.api.bootstrap(this.settings()));
  }

  // ── Consultas ──────────────────────────────────────────────────────
  plantById(id: string | null): Plant | undefined {
    return id ? this.plants().find((plant) => plant.id === id) : undefined;
  }

  stationById(id: string | null): Station | undefined {
    return id ? this.stations().find((station) => station.id === id) : undefined;
  }

  tankById(id: string | null): Tank | undefined {
    return id ? this.tanks().find((tank) => tank.id === id) : undefined;
  }

  companyById(id: string | null): Company | undefined {
    return id ? this.companies().find((company) => company.id === id) : undefined;
  }

  operationById(id: string | null): Operation | undefined {
    return id ? this.operations().find((operation) => operation.id === id) : undefined;
  }

  operationByCode(code: string): Operation | undefined {
    return this.operations().find((operation) => operation.code === code);
  }

  driverById(id: string): Driver | undefined {
    return this.drivers().find((driver) => driver.id === id);
  }

  userById(id: string): User | undefined {
    return this.users().find((user) => user.id === id);
  }

  documentById(id: string): AgDocument | undefined {
    return this.documents().find((document) => document.id === id);
  }

  controlById(id: string): OperationalControl | undefined {
    return this.operationalControls().find((control) => control.id === id);
  }

  documentsOfOperation(operationId: string): AgDocument[] {
    return this.documents().filter((document) => document.operationId === operationId);
  }

  evidencesOfOperation(operationId: string): Evidence[] {
    return this.evidences().filter((evidence) => evidence.operationId === operationId);
  }

  evidencesOfDocument(documentId: string): Evidence[] {
    return this.evidences().filter((evidence) => evidence.documentId === documentId);
  }

  evidencesOfControl(controlId: string): Evidence[] {
    return this.evidences().filter((evidence) => evidence.controlId === controlId);
  }

  incidentsOfCistern(cisternId: string): Incident[] {
    return this.incidents().filter((incident) => incident.cisternId === cisternId);
  }

  alertsOfPlant(plantId: string): Alert[] {
    return this.alerts().filter((alert) => alert.plantId === plantId);
  }

  alertsOfStation(stationId: string): Alert[] {
    return this.alerts().filter((alert) => alert.stationId === stationId);
  }

  operationsOfPlant(plantId: string): Operation[] {
    return this.operations().filter((operation) => operation.plantId === plantId);
  }

  documentsOfStation(stationId: string): AgDocument[] {
    return this.documents().filter((document) => document.stationId === stationId);
  }

  /**
   * CHECK ADMIN GO de una declaración (§18). Se calcula al vuelo con las
   * reglas puras, así que siempre refleja el estado actual.
   */
  declarationFindings(declaration: Declaration): ValidationFinding[] {
    const input: DeclarationValidationInput = {
      declaration,
      company: this.companyById(declaration.companyId),
      operations: this.operations().filter((operation) =>
        declaration.operationIds.includes(operation.id),
      ),
      documents: this.documents().filter((document) =>
        declaration.documentIds.includes(document.id),
      ),
      requirements: this.requirements(),
      allOperations: this.operations(),
      warningDays: this.documentWarningDays(),
      thresholdPercent: this.maxVolumeDifferencePercent(),
      reference: this.referenceDate,
    };
    return validateDeclaration(input);
  }

  // ── Escrituras ─────────────────────────────────────────────────────
  async createOperation(draft: Parameters<AdminGoApi['createOperation']>[0]): Promise<Operation> {
    return this.commit(
      () => this.api.createOperation(draft),
      'Operación',
      draft.type,
      'Crear operación',
    );
  }

  async updateOperation(
    id: string,
    draft: Parameters<AdminGoApi['updateOperation']>[1],
  ): Promise<Operation> {
    const before = this.operationById(id);
    return this.commit(
      () => this.api.updateOperation(id, draft),
      'Operación',
      before?.code ?? id,
      'Modificar operación',
      before,
    );
  }

  async createDocument(draft: Parameters<AdminGoApi['createDocument']>[0]): Promise<AgDocument> {
    return this.commit(
      () => this.api.createDocument(draft),
      'Documento',
      draft.name,
      'Cargar documento',
    );
  }

  async addDocumentVersion(
    id: string,
    draft: Parameters<AdminGoApi['addDocumentVersion']>[1],
  ): Promise<AgDocument> {
    const before = this.documentById(id);
    return this.commit(
      () => this.api.addDocumentVersion(id, draft),
      'Documento',
      before?.code ?? id,
      'Nueva versión de documento',
      before ? { version: String(before.versions.length) } : undefined,
    );
  }

  async createControl(
    draft: Parameters<AdminGoApi['createControl']>[0],
  ): Promise<OperationalControl> {
    return this.commit(
      () => this.api.createControl(draft),
      'Control operativo',
      this.plantById(draft.plantId)?.code ?? draft.plantId,
      'Programar control',
    );
  }

  async openControl(id: string): Promise<OperationalControl> {
    const before = this.controlById(id);
    return this.commit(
      () => this.api.openControl(id, new Date().toISOString()),
      'Control operativo',
      before?.code ?? id,
      'Abrir control',
      before ? { status: before.status } : undefined,
    );
  }

  /** Cierra el control, genera informe y, si procede, abre incidencia (§10). */
  async closeControl(
    id: string,
    draft: Parameters<AdminGoApi['closeControl']>[1],
  ): Promise<OperationalControl> {
    const before = this.controlById(id);
    return this.commit(
      async () => (await this.api.closeControl(id, draft)).control,
      'Control operativo',
      before?.code ?? id,
      'Cerrar control operativo',
      before ? { status: before.status, balance: String(before.balance) } : undefined,
    );
  }

  async createUser(draft: Parameters<AdminGoApi['createUser']>[0]): Promise<User> {
    return this.commit(
      () => this.api.createUser(draft),
      'Usuario',
      draft.username,
      'Crear usuario',
    );
  }

  async updateUser(id: string, patch: Parameters<AdminGoApi['updateUser']>[1]): Promise<User> {
    const before = this.userById(id);
    return this.commit(
      () => this.api.updateUser(id, patch),
      'Usuario',
      before?.username ?? id,
      'Modificar usuario',
      before ?? undefined,
    );
  }

  async createRequirement(
    draft: Parameters<AdminGoApi['createRequirement']>[0],
  ): Promise<Requirement> {
    return this.commit(
      () => this.api.createRequirement(draft),
      'Requisito',
      draft.code,
      'Crear requisito',
    );
  }

  async updateRequirement(
    id: string,
    patch: Parameters<AdminGoApi['updateRequirement']>[1],
  ): Promise<Requirement> {
    const before = this.requirements().find((requirement) => requirement.id === id);
    return this.commit(
      () => this.api.updateRequirement(id, patch),
      'Requisito',
      before?.code ?? id,
      'Modificar requisito',
      before ?? undefined,
    );
  }

  async createEvidence(draft: Parameters<AdminGoApi['createEvidence']>[0]): Promise<Evidence> {
    return this.commit(
      () => this.api.createEvidence(draft),
      'Evidencia',
      draft.fileName,
      'Adjuntar evidencia',
    );
  }

  async setAlertStatus(id: string, status: AlertStatus): Promise<Alert> {
    const username = this.currentUsername();
    this.error.set(null);
    this.busy.set(true);
    try {
      const alert = await this.api.setAlertStatus(id, status, username);
      await this.sync();
      return alert;
    } catch (error) {
      this.error.set(describeError(error));
      throw error;
    } finally {
      this.busy.set(false);
    }
  }

  /** Persiste el resultado del CHECK ADMIN GO en la declaración (§18). */
  async validateDeclaration(id: string): Promise<Declaration> {
    const declaration = this.declarations().find((item) => item.id === id);
    if (!declaration) {
      throw new AdminGoApiError('not-found', `Declaración no encontrada: ${id}.`);
    }
    const level = complianceLevelOf(this.declarationFindings(declaration));
    this.error.set(null);
    this.busy.set(true);
    try {
      const saved = await this.api.saveDeclarationValidation(id, level, this.currentUsername());
      await this.sync();
      return saved;
    } catch (error) {
      this.error.set(describeError(error));
      throw error;
    } finally {
      this.busy.set(false);
    }
  }

  /** Descarta el mensaje de error en curso. */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Guarda los parámetros configurables (§14): los persiste para que sobrevivan
   * a una recarga y deja constancia en auditoría de cada umbral modificado
   * (§27). Antes el botón «Guardar» no hacía absolutamente nada.
   */
  async saveSettings(): Promise<void> {
    const before = this.storedConfig;
    const after = this.settings();
    this.error.set(null);
    this.busy.set(true);
    try {
      writeStoredRuleConfig(after);
      this.storedConfig = after;
      for (const change of describeChanges(before, after)) {
        await this.appendAudit('Configuración', 'parámetros', change, 'Modificar parámetros');
      }
      await this.sync();
    } catch (error) {
      this.error.set(describeError(error));
      throw error;
    } finally {
      this.busy.set(false);
    }
  }

  /** Registra en auditoría la generación de un reporte (§26, §27). */
  async logReportGenerated(slug: string, format: 'pdf' | 'xlsx'): Promise<void> {
    await this.api.appendAudit({
      username: this.currentUsername(),
      entityType: 'Reporte',
      entityRef: slug,
      field: 'formato',
      previousValue: '',
      newValue: format,
      action: 'Generar reporte',
    });
    await this.sync();
  }

  /**
   * Envuelve una escritura: audita el cambio campo a campo (§27), refresca las
   * vistas y deja el error disponible para la UI en lugar de tragárselo.
   */
  private async commit<T extends { id: string }>(
    action: () => Promise<T>,
    entityType: string,
    entityRef: string,
    auditAction: string,
    before?: object,
  ): Promise<T> {
    this.error.set(null);
    this.busy.set(true);
    try {
      const result = await action();
      if (before) {
        for (const change of describeChanges(before, result)) {
          await this.appendAudit(entityType, entityRef, change, auditAction);
        }
      } else {
        await this.appendAudit(
          entityType,
          entityRef,
          { field: 'registro', previousValue: '', newValue: 'creado' },
          auditAction,
        );
      }
      await this.sync();
      return result;
    } catch (error) {
      this.error.set(describeError(error));
      throw error;
    } finally {
      this.busy.set(false);
    }
  }

  private async appendAudit(
    entityType: string,
    entityRef: string,
    change: FieldChange,
    action: string,
  ): Promise<void> {
    await this.api.appendAudit({
      username: this.currentUsername(),
      entityType,
      entityRef,
      field: change.field,
      previousValue: change.previousValue,
      newValue: change.newValue,
      action,
    });
  }

  private currentUsername(): string {
    return this.auth.currentUser()?.username ?? 'sistema';
  }
}

interface FieldChange {
  field: string;
  previousValue: string;
  newValue: string;
}

/** Campos que no se auditan por ser ruido técnico. */
const NON_AUDITABLE_FIELDS = new Set(['id', 'updatedAt', 'evidenceIds', 'incidentIds']);

/** Diferencia campo a campo entre dos versiones de una entidad (§27). */
function describeChanges(before: object, after: object): FieldChange[] {
  const beforeRecord = before as Record<string, unknown>;
  const afterRecord = after as Record<string, unknown>;
  const changes: FieldChange[] = [];
  for (const [field, next] of Object.entries(afterRecord)) {
    if (NON_AUDITABLE_FIELDS.has(field) || typeof next === 'object') {
      continue;
    }
    const previous = beforeRecord[field];
    if (previous === undefined || typeof previous === 'object') {
      continue;
    }
    const previousText = String(previous);
    const nextText = String(next);
    if (previousText !== nextText) {
      changes.push({ field, previousValue: previousText, newValue: nextText });
    }
  }
  // Si nada cambió no se inventa una entrada de auditoría.
  return changes;
}

function describeError(error: unknown): string {
  if (error instanceof AdminGoApiError) {
    return error.message;
  }
  return error instanceof Error ? error.message : 'Error inesperado en la capa de datos.';
}

function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

function statusWeight(status: Plant['status']): number {
  return status === 'red' ? 0 : status === 'yellow' ? 1 : 2;
}
