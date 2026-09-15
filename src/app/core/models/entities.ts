import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  CisternStatus,
  ComplianceLevel,
  ControlShift,
  ControlStatus,
  DeclarationStatus,
  DocumentStatus,
  IncidentStatus,
  OperationStatus,
  OperationType,
  PlantStatus,
  QualityStatus,
  UserRole,
  VolumeDirection,
} from './enums';

/** Identificadores de las 24 entidades del modelo inicial (§28). */
export interface BaseEntity {
  id: string;
}

/* ── Seguridad y organización (§6, §7, §28) ────────────────────────── */
export interface Permission extends BaseEntity {
  code: string;
  description: string;
}

export interface Role extends BaseEntity {
  name: UserRole;
  permissionCodes: string[];
}

export interface User extends BaseEntity {
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  companyId: string;
  active: boolean;
}

export interface Company extends BaseEntity {
  name: string;
  nit: string;
  kind: 'Importador' | 'Transportista' | 'Estación de servicio' | 'Operador';
  contactName: string;
  contactEmail: string;
  active: boolean;
}

/* ── Activos: plantas, estaciones, tanques (§9, §20, §21) ──────────── */
export interface Plant extends BaseEntity {
  code: string;
  name: string;
  city: string;
  department: string;
  status: PlantStatus;
  adminScore: number;
  products: string[];
  availableVolume: number;
  receivedToday: number;
  dispatchedToday: number;
  theoreticalBalance: number;
  physicalBalance: number;
  openOperations: number;
  cisternsInside: number;
  lastControlAt: string;
}

export interface Station extends BaseEntity {
  code: string;
  name: string;
  companyId: string;
  city: string;
  manager: string;
  /** Productos que comercializa la estación (§20). */
  products: string[];
  tanks: number;
  /** Capacidad total instalada de sus tanques, en litros (§20). */
  capacity: number;
  inventory: number;
  receivedToday: number;
  dispatchedToday: number;
  status: PlantStatus;
  /** Peor estado documental de sus expedientes (§20 «Documentación»). */
  documentStatus: DocumentStatus;
}

export interface Tank extends BaseEntity {
  code: string;
  stationId: string;
  product: string;
  capacity: number;
  physicalVolume: number;
  theoreticalVolume: number;
  status: PlantStatus;
  lastMeasuredAt: string;
}

export interface TankMeasurement extends BaseEntity {
  tankId: string;
  measuredAt: string;
  physicalVolume: number;
  calculatedVolume: number;
  difference: number;
  evidenceId: string | null;
}

export interface Product extends BaseEntity {
  code: string;
  name: string;
  unit: 'L';
}

/* ── Transporte: cisternas y conductores (§19) ─────────────────────── */
export interface Cistern extends BaseEntity {
  plate: string;
  companyId: string;
  driverId: string;
  capacity: number;
  sealCodes: string[];
  status: CisternStatus;
  documentStatus: DocumentStatus;
  operationsCount: number;
}

export interface Driver extends BaseEntity {
  fullName: string;
  license: string;
  phone: string;
  companyId: string;
  active: boolean;
}

/* ── Operaciones y trazabilidad (§12, §13) ─────────────────────────── */
export interface Operation extends BaseEntity {
  /** Identificador único, p. ej. AG-DI-2026-000001. */
  code: string;
  type: OperationType;
  status: OperationStatus;
  product: string;
  origin: string;
  destination: string;
  companyId: string;
  scheduledVolume: number;
  documentedVolume: number;
  receivedVolume: number;
  cisternPlate: string;
  driverId: string;
  driverName: string;
  sealCodes: string[];
  plantId: string | null;
  stationId: string | null;
  tankId: string | null;
  documentIds: string[];
  evidenceIds: string[];
  incidentIds: string[];
  scheduledAt: string;
  updatedAt: string;
}

export interface OperationDocument extends BaseEntity {
  operationId: string;
  documentId: string;
  requirementCode: string;
  verified: boolean;
}

/* ── Volúmenes e inventario (§14) ──────────────────────────────────── */
export interface Volume extends BaseEntity {
  operationId: string;
  plantId: string | null;
  stationId: string | null;
  direction: VolumeDirection;
  quantity: number;
  recordedAt: string;
  authorizedBy: string | null;
}

export interface InventoryMovement extends BaseEntity {
  tankId: string;
  operationId: string | null;
  direction: VolumeDirection;
  quantity: number;
  balanceAfter: number;
  recordedAt: string;
}

/* ── Documentos, requisitos y evidencias (§15, §16) ───────────────── */
export interface Requirement extends BaseEntity {
  code: string;
  name: string;
  appliesTo: 'cliente' | 'actividad' | 'vehículo' | 'instalación';
  mandatory: boolean;
  validityDays: number;
  /** Tipos de cliente a los que aplica; vacío = todos (§16). */
  clientKinds: Company['kind'][];
  /** Permite retirar un requisito sin borrar historial (§16, §27). */
  active: boolean;
}

/** Versión de un expediente: cada carga genera una nueva (§15 «Versiones»). */
export interface DocumentVersion {
  version: number;
  uploadedAt: string;
  uploadedBy: string;
  fileName: string;
  mimeType: string;
  /** Tamaño en bytes; el contenido binario lo custodiará el backend (§29). */
  sizeBytes: number;
  note: string | null;
}

/** Documento cargado. Se llama `AgDocument` para no colisionar con el DOM `Document`. */
export interface AgDocument extends BaseEntity {
  code: string;
  name: string;
  category: string;
  companyId: string;
  /** Instalación a la que aplica, para la documentación de EESS (§20). */
  stationId: string | null;
  operationId: string | null;
  issuedAt: string;
  expiresAt: string | null;
  status: DocumentStatus;
  responsible: string;
  /** Historial completo de cargas; la vigente es la última (§15). */
  versions: DocumentVersion[];
  observation: string | null;
  evidenceIds: string[];
}

export interface Evidence extends BaseEntity {
  kind: 'photo' | 'pdf';
  fileName: string;
  description: string;
  capturedAt: string;
  capturedBy: string;
  operationId: string | null;
  plantId: string | null;
  tankId: string | null;
  /** Documento que respalda esta evidencia (§15). */
  documentId: string | null;
  /** Control operativo del que forma parte (§10). */
  controlId: string | null;
}

/* ── Alertas e incidencias (§25) ──────────────────────────────────── */
export interface Alert extends BaseEntity {
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  entityRef: string;
  plantId: string | null;
  /** Estación afectada, cuando la alerta no es de planta (§20, §25). */
  stationId: string | null;
  /** Origen de la alerta: derivada por reglas o registrada a mano (§25). */
  source: 'regla' | 'manual';
  createdAt: string;
}

export interface Incident extends BaseEntity {
  code: string;
  plantId: string | null;
  operationId: string | null;
  /** Cisterna implicada, cuando la incidencia es del vehículo (§19). */
  cisternId: string | null;
  /** Control operativo donde se detectó, si aplica (§10). */
  controlId: string | null;
  description: string;
  severity: AlertSeverity;
  openedAt: string;
  closedAt: string | null;
  status: IncidentStatus;
}

/* ── Producto y calidad (§22) ─────────────────────────────────────── */
export interface QualityControl extends BaseEntity {
  code: string;
  product: string;
  lot: string;
  plantId: string;
  controlledAt: string;
  controlType: string;
  sampleRef: string | null;
  sealCode: string | null;
  certificate: string | null;
  result: string;
  observation: string;
  status: QualityStatus;
  evidenceId: string | null;
}

/* ── Declaraciones (§17, §18) ─────────────────────────────────────── */
export interface Declaration extends BaseEntity {
  code: string;
  companyId: string;
  period: string;
  /** Operaciones consolidadas en el periodo (§17). */
  operationIds: string[];
  /** Documentos que respaldan la declaración (§17). */
  documentIds: string[];
  totalVolume: number;
  closingInventory: number;
  adjustments: number;
  validation: ComplianceLevel;
  status: DeclarationStatus;
  responsible: string;
  presentedAt: string | null;
  /** Número de versión de la declaración (§17 «Versiones»). */
  version: number;
}

/* ── Control operativo de planta (§10, §11) ───────────────────────── */
export interface OperationalControl extends BaseEntity {
  /** Identificador visible del control, p. ej. CTL-2026-000012 (§10). */
  code: string;
  plantId: string;
  /** Programación del control (§10). */
  scheduledAt: string;
  controlDate: string;
  shift: ControlShift;
  supervisor: string;
  product: string;
  initialVolume: number;
  receivedVolume: number;
  dispatchedVolume: number;
  /** Saldo = inicial + recepciones − despachos (§14). */
  balance: number;
  cisternsIn: number;
  cisternsOut: number;
  sealsVerified: number;
  documentsVerified: number;
  /** Evidencias fotográficas/documentales del control (§10). */
  evidenceIds: string[];
  /** Incidencias levantadas durante el control (§10). */
  incidentIds: string[];
  /** Controles de producto/calidad tomados en el control (§10, §22). */
  qualityControlIds: string[];
  observation: string;
  status: ControlStatus;
  /** Marcas del ciclo de vida (§10): llegada, cierre e informe. */
  arrivedAt: string | null;
  closedAt: string | null;
  /** Documento con el informe generado al cerrar (§10). */
  reportDocumentId: string | null;
}

/* ── Auditoría (§27) ──────────────────────────────────────────────── */
export interface AuditLog extends BaseEntity {
  username: string;
  at: string;
  entityType: string;
  entityRef: string;
  field: string;
  previousValue: string;
  newValue: string;
  action: string;
}

/** Indicadores consolidados de la Torre de Control (§8). */
export interface ControlTowerKpis {
  plantsTotal: number;
  plantsGreen: number;
  plantsYellow: number;
  plantsRed: number;
  receivedVolume: number;
  dispatchedVolume: number;
  theoreticalInventory: number;
  physicalInventory: number;
  volumeDifference: number;
  volumeDifferencePercent: number;
  openOperations: number;
  observedOperations: number;
  documentsExpiringSoon: number;
  documentsExpired: number;
  pendingDeclarations: number;
  criticalAlerts: number;
  openIncidents: number;
  adminScore: number;
}
