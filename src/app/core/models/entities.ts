import {
  AlertSeverity,
  AlertStatus,
  AlertType,
  ComplianceLevel,
  ControlStatus,
  DeclarationStatus,
  DocumentStatus,
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
  tanks: number;
  inventory: number;
  receivedToday: number;
  dispatchedToday: number;
  status: PlantStatus;
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
  status: 'Disponible' | 'En ruta' | 'En planta' | 'Mantenimiento';
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
}

/** Documento cargado. Se llama `AgDocument` para no colisionar con el DOM `Document`. */
export interface AgDocument extends BaseEntity {
  code: string;
  name: string;
  category: string;
  companyId: string;
  operationId: string | null;
  issuedAt: string;
  expiresAt: string | null;
  status: DocumentStatus;
  responsible: string;
  version: number;
  observation: string | null;
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
}

/* ── Alertas e incidencias (§25) ──────────────────────────────────── */
export interface Alert extends BaseEntity {
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  entityRef: string;
  plantId: string | null;
  createdAt: string;
}

export interface Incident extends BaseEntity {
  code: string;
  plantId: string | null;
  operationId: string | null;
  description: string;
  severity: AlertSeverity;
  openedAt: string;
  closedAt: string | null;
  status: 'Abierta' | 'En revisión' | 'Cerrada';
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
  operationsCount: number;
  totalVolume: number;
  closingInventory: number;
  adjustments: number;
  documentsCount: number;
  validation: ComplianceLevel;
  status: DeclarationStatus;
  responsible: string;
  presentedAt: string | null;
}

/* ── Control operativo de planta (§10, §11) ───────────────────────── */
export interface OperationalControl extends BaseEntity {
  plantId: string;
  controlDate: string;
  shift: 'Mañana' | 'Tarde' | 'Noche';
  supervisor: string;
  product: string;
  initialVolume: number;
  receivedVolume: number;
  dispatchedVolume: number;
  balance: number;
  cisternsIn: number;
  cisternsOut: number;
  sealsVerified: number;
  documentsVerified: number;
  incidentsCount: number;
  photosCount: number;
  observation: string;
  status: ControlStatus;
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
