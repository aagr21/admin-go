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

/**
 * Contrato de datos de AdminGo (§29 «API frontend/backend», §31 «DISEÑAR API
 * DESDE EL INICIO»).
 *
 * Es la frontera única entre la interfaz y el origen de datos. Hoy la
 * implementación es `InMemoryAdminGoApi` (dataset de demostración); cuando
 * exista backend se añade `HttpAdminGoApi` sobre `HttpClient` y se cambia un
 * único provider sin tocar ninguna pantalla. Cada método documenta el verbo y
 * la ruta que le corresponderán.
 */

/** Estado completo que la aplicación carga al arrancar. */
export interface AdminGoDataset {
  companies: Company[];
  products: Product[];
  plants: Plant[];
  stations: Station[];
  tanks: Tank[];
  cisterns: Cistern[];
  drivers: Driver[];
  requirements: Requirement[];
  users: User[];
  operations: Operation[];
  documents: AgDocument[];
  evidences: Evidence[];
  alerts: Alert[];
  incidents: Incident[];
  qualityControls: QualityControl[];
  declarations: Declaration[];
  operationalControls: OperationalControl[];
  auditLogs: AuditLog[];
  volumes: Volume[];
  inventoryMovements: InventoryMovement[];
  tankMeasurements: TankMeasurement[];
}

/** Configuración que condiciona la derivación de reglas (§14). */
export interface RuleConfig {
  /** Días de aviso previo de vencimiento documental. */
  warningDays: number;
  /** Umbral de diferencia volumétrica, en porcentaje. */
  thresholdPercent: number;
  /** Días sin cierre tras los cuales una operación genera alerta (§25). */
  stalledOperationDays: number;
}

export interface AuditDraft {
  username: string;
  entityType: string;
  entityRef: string;
  field: string;
  previousValue: string;
  newValue: string;
  action: string;
}

export interface OperationDraft {
  type: Operation['type'];
  status: Operation['status'];
  product: string;
  origin: string;
  destination: string;
  companyId: string;
  scheduledVolume: number;
  documentedVolume: number;
  receivedVolume: number;
  cisternPlate: string;
  driverId: string;
  plantId: string | null;
  stationId: string | null;
  tankId: string | null;
  scheduledAt: string;
}

export interface DocumentDraft {
  name: string;
  category: string;
  code: string;
  companyId: string;
  stationId: string | null;
  operationId: string | null;
  issuedAt: string;
  expiresAt: string | null;
  responsible: string;
  observation: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
}

export interface DocumentVersionDraft {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  note: string | null;
  uploadedBy: string;
}

export interface ControlDraft {
  plantId: string;
  scheduledAt: string;
  shift: OperationalControl['shift'];
  supervisor: string;
  product: string;
  initialVolume: number;
}

export interface ControlClosureDraft {
  receivedVolume: number;
  dispatchedVolume: number;
  cisternsIn: number;
  cisternsOut: number;
  sealsVerified: number;
  documentsVerified: number;
  observation: string;
  /** Genera una incidencia al cerrar si el control deja observaciones (§10). */
  openIncident: boolean;
  incidentDescription: string;
  closedBy: string;
}

export interface UserDraft {
  username: string;
  fullName: string;
  email: string;
  role: User['role'];
  companyId: string;
  active: boolean;
}

export interface RequirementDraft {
  code: string;
  name: string;
  appliesTo: Requirement['appliesTo'];
  mandatory: boolean;
  validityDays: number;
  clientKinds: Requirement['clientKinds'];
  active: boolean;
}

export interface EvidenceDraft {
  kind: Evidence['kind'];
  fileName: string;
  description: string;
  capturedBy: string;
  operationId: string | null;
  plantId: string | null;
  tankId: string | null;
  documentId: string | null;
  controlId: string | null;
}

/** Error de la capa de datos, tipificado para que la UI decida qué mostrar. */
export class AdminGoApiError extends Error {
  constructor(
    readonly code: 'not-found' | 'invalid',
    message: string,
  ) {
    super(message);
    this.name = 'AdminGoApiError';
  }
}

export abstract class AdminGoApi {
  /** GET /bootstrap — carga inicial de todas las colecciones. */
  abstract bootstrap(config: RuleConfig): Promise<AdminGoDataset>;

  /** POST /operations */
  abstract createOperation(draft: OperationDraft): Promise<Operation>;
  /** PUT /operations/:id */
  abstract updateOperation(id: string, draft: OperationDraft): Promise<Operation>;

  /** POST /documents */
  abstract createDocument(draft: DocumentDraft): Promise<AgDocument>;
  /** POST /documents/:id/versions */
  abstract addDocumentVersion(id: string, draft: DocumentVersionDraft): Promise<AgDocument>;

  /** POST /controls */
  abstract createControl(draft: ControlDraft): Promise<OperationalControl>;
  /** POST /controls/:id/open */
  abstract openControl(id: string, arrivedAt: string): Promise<OperationalControl>;
  /** POST /controls/:id/close */
  abstract closeControl(
    id: string,
    draft: ControlClosureDraft,
  ): Promise<{ control: OperationalControl; incident: Incident | null }>;

  /** POST /users */
  abstract createUser(draft: UserDraft): Promise<User>;
  /** PATCH /users/:id */
  abstract updateUser(id: string, patch: Partial<UserDraft>): Promise<User>;

  /** POST /requirements */
  abstract createRequirement(draft: RequirementDraft): Promise<Requirement>;
  /** PATCH /requirements/:id */
  abstract updateRequirement(id: string, patch: Partial<RequirementDraft>): Promise<Requirement>;

  /** POST /evidences */
  abstract createEvidence(draft: EvidenceDraft): Promise<Evidence>;

  /** PATCH /alerts/:id */
  abstract setAlertStatus(id: string, status: AlertStatus, by: string): Promise<Alert>;

  /** POST /declarations/:id/validate — persiste el resultado del CHECK (§18). */
  abstract saveDeclarationValidation(
    id: string,
    validation: Declaration['validation'],
    by: string,
  ): Promise<Declaration>;

  /** POST /audit-logs */
  abstract appendAudit(draft: AuditDraft): Promise<AuditLog>;
}
