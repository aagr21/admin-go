import { Injectable } from '@angular/core';
import {
  AgDocument,
  Alert,
  AuditLog,
  Cistern,
  Company,
  Declaration,
  Driver,
  Evidence,
  Incident,
  InventoryMovement,
  Operation,
  OperationalControl,
  Plant,
  Product,
  QualityControl,
  Requirement,
  Station,
  Tank,
  TankMeasurement,
  User,
  Volume,
} from '@core/models/entities';
import { AlertStatus } from '@core/models/enums';
import { DATASET_DATE_ISO } from '@core/data/dataset-date';
import { ALERTS, EVIDENCES, INCIDENTS, QUALITY_CONTROLS } from '@core/data/mock-activity';
import {
  AUDIT_LOGS,
  DECLARATIONS,
  INVENTORY_MOVEMENTS,
  OPERATIONAL_CONTROLS,
  TANK_MEASUREMENTS,
  VOLUMES,
} from '@core/data/mock-compliance';
import {
  CISTERNS,
  COMPANIES,
  DOCUMENTS,
  DRIVERS,
  OPERATIONS,
  PLANTS,
  PRODUCTS,
  REQUIREMENTS,
  STATIONS,
  TANKS,
  USERS,
} from '@core/data/mock-data';
import { deriveAlerts } from '@core/rules/alert-rules';
import {
  AdminGoApi,
  AdminGoApiError,
  AdminGoDataset,
  AuditDraft,
  ControlClosureDraft,
  ControlDraft,
  DocumentDraft,
  DocumentVersionDraft,
  EvidenceDraft,
  OperationDraft,
  RequirementDraft,
  RuleConfig,
  UserDraft,
} from './admin-go.api';

const OPERATION_CODE_PREFIX: Record<Operation['type'], string> = {
  Recepción: 'RC',
  Despacho: 'DP',
  Traslado: 'TR',
  Venta: 'VT',
  Ajuste: 'AJ',
};

/**
 * Implementación del contrato de datos sobre el dataset de demostración.
 *
 * Hace las veces de servidor: es el único punto que muta el estado, genera
 * identificadores y marcas de tiempo, y recalcula las alertas derivadas. Las
 * pantallas nunca tocan `mock-data` directamente, así que sustituir esto por
 * `HttpAdminGoApi` no obliga a cambiarlas.
 */
@Injectable()
export class InMemoryAdminGoApi extends AdminGoApi {
  private companies: Company[] = clone(COMPANIES);
  private products: Product[] = clone(PRODUCTS);
  private plants: Plant[] = clone(PLANTS);
  private stations: Station[] = clone(STATIONS);
  private tanks: Tank[] = clone(TANKS);
  private cisterns: Cistern[] = clone(CISTERNS);
  private drivers: Driver[] = clone(DRIVERS);
  private requirements: Requirement[] = clone(REQUIREMENTS);
  private users: User[] = clone(USERS);
  private operations: Operation[] = clone(OPERATIONS);
  private documents: AgDocument[] = clone(DOCUMENTS);
  private evidences: Evidence[] = clone(EVIDENCES);
  private alerts: Alert[] = clone(ALERTS);
  private incidents: Incident[] = clone(INCIDENTS);
  private qualityControls: QualityControl[] = clone(QUALITY_CONTROLS);
  private declarations: Declaration[] = clone(DECLARATIONS);
  private operationalControls: OperationalControl[] = clone(OPERATIONAL_CONTROLS);
  private auditLogs: AuditLog[] = clone(AUDIT_LOGS);
  private volumes: Volume[] = clone(VOLUMES);
  private inventoryMovements: InventoryMovement[] = clone(INVENTORY_MOVEMENTS);
  private tankMeasurements: TankMeasurement[] = clone(TANK_MEASUREMENTS);

  /** Reloj del "servidor": el dataset de demostración no avanza con el real. */
  private clockOffsetSeconds = 0;
  private sequence = 0;

  async bootstrap(config: RuleConfig): Promise<AdminGoDataset> {
    this.alerts = this.reconcileAlerts(config);
    return this.snapshot();
  }

  async createOperation(draft: OperationDraft): Promise<Operation> {
    this.requireEntity(this.companies, draft.companyId, 'Empresa');
    const cistern = this.cisterns.find((item) => item.plate === draft.cisternPlate);
    const driver = this.drivers.find((item) => item.id === draft.driverId);
    const at = this.nowIso();
    const operation: Operation = {
      id: this.nextId('op'),
      code: this.nextOperationCode(draft.type),
      type: draft.type,
      status: draft.status,
      product: draft.product,
      origin: draft.origin,
      destination: draft.destination,
      companyId: draft.companyId,
      scheduledVolume: draft.scheduledVolume,
      documentedVolume: draft.documentedVolume,
      receivedVolume: draft.receivedVolume,
      cisternPlate: draft.cisternPlate,
      driverId: draft.driverId,
      driverName: driver?.fullName ?? '—',
      sealCodes: cistern?.sealCodes ?? [],
      plantId: draft.plantId,
      stationId: draft.stationId,
      tankId: draft.tankId,
      documentIds: [],
      evidenceIds: [],
      incidentIds: [],
      scheduledAt: draft.scheduledAt,
      updatedAt: at,
    };
    this.operations = [operation, ...this.operations];
    return operation;
  }

  async updateOperation(id: string, draft: OperationDraft): Promise<Operation> {
    const current = this.requireEntity(this.operations, id, 'Operación');
    const driver = this.drivers.find((item) => item.id === draft.driverId);
    const updated: Operation = {
      ...current,
      ...draft,
      driverName: driver?.fullName ?? current.driverName,
      updatedAt: this.nowIso(),
    };
    this.operations = this.operations.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async createDocument(draft: DocumentDraft): Promise<AgDocument> {
    this.requireEntity(this.companies, draft.companyId, 'Empresa');
    const at = this.nowIso();
    const document: AgDocument = {
      id: this.nextId('doc'),
      code: draft.code,
      name: draft.name,
      category: draft.category,
      companyId: draft.companyId,
      stationId: draft.stationId,
      operationId: draft.operationId,
      issuedAt: draft.issuedAt,
      expiresAt: draft.expiresAt,
      status: 'Vigente',
      responsible: draft.responsible,
      versions: [
        {
          version: 1,
          uploadedAt: at,
          uploadedBy: draft.uploadedBy,
          fileName: draft.fileName,
          mimeType: draft.mimeType,
          sizeBytes: draft.sizeBytes,
          note: 'Carga inicial del expediente.',
        },
      ],
      observation: draft.observation,
      evidenceIds: [],
    };
    this.documents = [document, ...this.documents];
    return document;
  }

  async addDocumentVersion(id: string, draft: DocumentVersionDraft): Promise<AgDocument> {
    const current = this.requireEntity(this.documents, id, 'Documento');
    const version = current.versions.length + 1;
    const updated: AgDocument = {
      ...current,
      status: current.status === 'Faltante' ? 'Vigente' : current.status,
      versions: [
        ...current.versions,
        {
          version,
          uploadedAt: this.nowIso(),
          uploadedBy: draft.uploadedBy,
          fileName: draft.fileName,
          mimeType: draft.mimeType,
          sizeBytes: draft.sizeBytes,
          note: draft.note,
        },
      ],
    };
    this.documents = this.documents.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async createControl(draft: ControlDraft): Promise<OperationalControl> {
    this.requireEntity(this.plants, draft.plantId, 'Planta');
    const date = draft.scheduledAt.slice(0, 10);
    const control: OperationalControl = {
      id: this.nextId('ctl'),
      code: `CTL-2026-${String(++this.sequence).padStart(6, '0')}`,
      plantId: draft.plantId,
      scheduledAt: draft.scheduledAt,
      controlDate: date,
      shift: draft.shift,
      supervisor: draft.supervisor,
      product: draft.product,
      initialVolume: draft.initialVolume,
      receivedVolume: 0,
      dispatchedVolume: 0,
      balance: draft.initialVolume,
      cisternsIn: 0,
      cisternsOut: 0,
      sealsVerified: 0,
      documentsVerified: 0,
      evidenceIds: [],
      incidentIds: [],
      qualityControlIds: [],
      observation: '',
      status: 'Programado',
      arrivedAt: null,
      closedAt: null,
      reportDocumentId: null,
    };
    this.operationalControls = [control, ...this.operationalControls];
    return control;
  }

  async openControl(id: string, arrivedAt: string): Promise<OperationalControl> {
    const current = this.requireEntity(this.operationalControls, id, 'Control');
    if (current.status !== 'Programado') {
      throw new AdminGoApiError('invalid', 'Solo se puede abrir un control programado.');
    }
    const updated: OperationalControl = { ...current, status: 'En ejecución', arrivedAt };
    this.operationalControls = this.operationalControls.map((item) =>
      item.id === id ? updated : item,
    );
    return updated;
  }

  async closeControl(
    id: string,
    draft: ControlClosureDraft,
  ): Promise<{ control: OperationalControl; incident: Incident | null }> {
    const current = this.requireEntity(this.operationalControls, id, 'Control');
    if (current.status === 'Cerrado') {
      throw new AdminGoApiError('invalid', 'El control ya está cerrado.');
    }
    const at = this.nowIso();
    const balance = current.initialVolume + draft.receivedVolume - draft.dispatchedVolume;
    const incident = draft.openIncident ? this.buildIncident(current, draft, at) : null;
    if (incident) {
      this.incidents = [incident, ...this.incidents];
    }
    // El cierre genera el informe como documento del expediente (§10).
    const report = this.buildControlReport(current, balance, at, draft.closedBy);
    this.documents = [report, ...this.documents];

    const updated: OperationalControl = {
      ...current,
      receivedVolume: draft.receivedVolume,
      dispatchedVolume: draft.dispatchedVolume,
      balance,
      cisternsIn: draft.cisternsIn,
      cisternsOut: draft.cisternsOut,
      sealsVerified: draft.sealsVerified,
      documentsVerified: draft.documentsVerified,
      observation: draft.observation,
      status: draft.openIncident ? 'Escalado' : 'Cerrado',
      closedAt: at,
      incidentIds: incident ? [...current.incidentIds, incident.id] : current.incidentIds,
      reportDocumentId: report.id,
    };
    this.operationalControls = this.operationalControls.map((item) =>
      item.id === id ? updated : item,
    );
    return { control: updated, incident };
  }

  async createUser(draft: UserDraft): Promise<User> {
    if (this.users.some((user) => user.username === draft.username)) {
      throw new AdminGoApiError('invalid', `El usuario «${draft.username}» ya existe.`);
    }
    this.requireEntity(this.companies, draft.companyId, 'Empresa');
    const user: User = { id: this.nextId('usr'), ...draft };
    this.users = [...this.users, user];
    return user;
  }

  async updateUser(id: string, patch: Partial<UserDraft>): Promise<User> {
    const current = this.requireEntity(this.users, id, 'Usuario');
    if (patch.username && patch.username !== current.username) {
      if (this.users.some((user) => user.username === patch.username && user.id !== id)) {
        throw new AdminGoApiError('invalid', `El usuario «${patch.username}» ya existe.`);
      }
    }
    const updated: User = { ...current, ...patch };
    this.users = this.users.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async createRequirement(draft: RequirementDraft): Promise<Requirement> {
    if (this.requirements.some((requirement) => requirement.code === draft.code)) {
      throw new AdminGoApiError('invalid', `El requisito «${draft.code}» ya existe.`);
    }
    const requirement: Requirement = { id: this.nextId('req'), ...draft };
    this.requirements = [...this.requirements, requirement];
    return requirement;
  }

  async updateRequirement(id: string, patch: Partial<RequirementDraft>): Promise<Requirement> {
    const current = this.requireEntity(this.requirements, id, 'Requisito');
    const updated: Requirement = { ...current, ...patch };
    this.requirements = this.requirements.map((item) => (item.id === id ? updated : item));
    return updated;
  }

  async createEvidence(draft: EvidenceDraft): Promise<Evidence> {
    const evidence: Evidence = {
      id: this.nextId('evd'),
      ...draft,
      capturedAt: this.nowIso(),
    };
    this.evidences = [evidence, ...this.evidences];
    if (draft.documentId) {
      this.documents = this.documents.map((document) =>
        document.id === draft.documentId
          ? { ...document, evidenceIds: [...document.evidenceIds, evidence.id] }
          : document,
      );
    }
    if (draft.controlId) {
      this.operationalControls = this.operationalControls.map((control) =>
        control.id === draft.controlId
          ? { ...control, evidenceIds: [...control.evidenceIds, evidence.id] }
          : control,
      );
    }
    return evidence;
  }

  async setAlertStatus(id: string, status: AlertStatus, by: string): Promise<Alert> {
    const current = this.requireEntity(this.alerts, id, 'Alerta');
    const updated: Alert = { ...current, status };
    this.alerts = this.alerts.map((alert) => (alert.id === id ? updated : alert));
    await this.appendAudit({
      username: by,
      entityType: 'Alerta',
      entityRef: current.entityRef,
      field: 'estado',
      previousValue: current.status,
      newValue: status,
      action: status === 'Atendida' ? 'Atender alerta' : 'Escalar alerta',
    });
    return updated;
  }

  async saveDeclarationValidation(
    id: string,
    validation: Declaration['validation'],
    by: string,
  ): Promise<Declaration> {
    const current = this.requireEntity(this.declarations, id, 'Declaración');
    const updated: Declaration = {
      ...current,
      validation,
      status: validation === 'critical' ? 'Observada' : 'Validada',
    };
    this.declarations = this.declarations.map((item) => (item.id === id ? updated : item));
    await this.appendAudit({
      username: by,
      entityType: 'Declaración',
      entityRef: current.code,
      field: 'validación',
      previousValue: current.validation,
      newValue: validation,
      action: 'Ejecutar CHECK ADMIN GO',
    });
    return updated;
  }

  async appendAudit(draft: AuditDraft): Promise<AuditLog> {
    const entry: AuditLog = { id: this.nextId('log'), at: this.nowIso(), ...draft };
    this.auditLogs = [entry, ...this.auditLogs];
    return entry;
  }

  // ── Interno ───────────────────────────────────────────────────────

  private snapshot(): AdminGoDataset {
    return clone({
      companies: this.companies,
      products: this.products,
      plants: this.plants,
      stations: this.stations,
      tanks: this.tanks,
      cisterns: this.cisterns,
      drivers: this.drivers,
      requirements: this.requirements,
      users: this.users,
      operations: this.operations,
      documents: this.documents,
      evidences: this.evidences,
      alerts: this.alerts,
      incidents: this.incidents,
      qualityControls: this.qualityControls,
      declarations: this.declarations,
      operationalControls: this.operationalControls,
      auditLogs: this.auditLogs,
      volumes: this.volumes,
      inventoryMovements: this.inventoryMovements,
      tankMeasurements: this.tankMeasurements,
    });
  }

  /**
   * Recalcula las alertas derivadas conservando el estado de las ya atendidas
   * (§25, §27): las reglas cambian, el historial no se pierde.
   */
  private reconcileAlerts(config: RuleConfig): Alert[] {
    const derived = deriveAlerts({
      documents: this.documents,
      operations: this.operations,
      tanks: this.tanks,
      declarations: this.declarations,
      incidents: this.incidents,
      warningDays: config.warningDays,
      thresholdPercent: config.thresholdPercent,
      stalledOperationDays: config.stalledOperationDays,
      reference: new Date(DATASET_DATE_ISO),
    });
    const previous = new Map(this.alerts.map((alert) => [alert.id, alert]));
    const derivedIds = new Set(derived.map((alert) => alert.id));
    const merged = derived.map((alert) => {
      const existing = previous.get(alert.id);
      return existing
        ? { ...alert, status: existing.status, createdAt: existing.createdAt }
        : alert;
    });
    // Se conservan las manuales y las ya atendidas que dejaron de aplicar.
    for (const alert of this.alerts) {
      if (!derivedIds.has(alert.id) && (alert.source === 'manual' || alert.status !== 'Abierta')) {
        merged.push(alert);
      }
    }
    return merged;
  }

  private buildIncident(
    control: OperationalControl,
    draft: ControlClosureDraft,
    at: string,
  ): Incident {
    return {
      id: this.nextId('inc'),
      code: `INC-2026-${String(++this.sequence).padStart(4, '0')}`,
      plantId: control.plantId,
      operationId: null,
      cisternId: null,
      controlId: control.id,
      description: draft.incidentDescription,
      severity: 'warning',
      openedAt: at,
      closedAt: null,
      status: 'Abierta',
    };
  }

  private buildControlReport(
    control: OperationalControl,
    balance: number,
    at: string,
    closedBy: string,
  ): AgDocument {
    const fileName = `informe-${control.code.toLowerCase()}.pdf`;
    return {
      id: this.nextId('doc'),
      code: `REQ-INF-01`,
      name: `Informe de control operativo ${control.code}`,
      category: 'Operativo',
      companyId: this.companies[0].id,
      stationId: null,
      operationId: null,
      issuedAt: at.slice(0, 10),
      expiresAt: null,
      status: 'Vigente',
      responsible: closedBy,
      versions: [
        {
          version: 1,
          uploadedAt: at,
          uploadedBy: closedBy,
          fileName,
          mimeType: 'application/pdf',
          sizeBytes: 96_000,
          note: `Generado automáticamente al cerrar el control (saldo ${balance} L).`,
        },
      ],
      observation: null,
      evidenceIds: [],
    };
  }

  private nextOperationCode(type: Operation['type']): string {
    const year = new Date(DATASET_DATE_ISO).getFullYear();
    const prefix = OPERATION_CODE_PREFIX[type];
    const existing = this.operations.filter((operation) =>
      operation.code.startsWith(`AG-${prefix}-`),
    );
    return `AG-${prefix}-${year}-${String(existing.length + 1).padStart(6, '0')}`;
  }

  private nextId(prefix: string): string {
    return `${prefix}-n${++this.sequence}`;
  }

  /** Marca de tiempo del "servidor", avanzando un segundo por operación. */
  private nowIso(): string {
    const base = new Date(DATASET_DATE_ISO).getTime();
    this.clockOffsetSeconds += 1;
    return new Date(base + this.clockOffsetSeconds * 1000).toISOString();
  }

  private requireEntity<T extends { id: string }>(
    collection: readonly T[],
    id: string,
    label: string,
  ): T {
    const found = collection.find((item) => item.id === id);
    if (!found) {
      throw new AdminGoApiError('not-found', `${label} no encontrado: ${id}.`);
    }
    return found;
  }
}

/** Copia profunda para que nadie mute el dataset por referencia. */
function clone<T>(value: T): T {
  return structuredClone(value);
}
