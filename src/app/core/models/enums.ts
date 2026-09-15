/**
 * Catálogos de estados, roles y clasificaciones de AdminGo.
 * Basado en el Documento de Requerimientos AdminGo v1.0 (§6, §15, §25, §29).
 *
 * Se usan `as const` + union types en lugar de enums para mantener
 * tree-shaking y compatibilidad con `isolatedModules`.
 */

/* ── Estados de semáforo por planta / instalación (§8) ─────────────── */
export const PLANT_STATUSES = ['green', 'yellow', 'red'] as const;
export type PlantStatus = (typeof PLANT_STATUSES)[number];

/** Resultado del CHECK ADMIN GO (§18). */
export const COMPLIANCE_LEVELS = ['ok', 'observed', 'critical'] as const;
export type ComplianceLevel = (typeof COMPLIANCE_LEVELS)[number];

/* ── Usuarios y roles (§6) ─────────────────────────────────────────── */
export const USER_ROLES = [
  'Superadministrador AdminGo',
  'Administrador cliente',
  'Gerente',
  'Responsable regulatorio',
  'Supervisor operativo AdminGo',
  'Operador de campo',
  'Responsable EESS',
  'Auditor',
] as const;
export type UserRole = (typeof USER_ROLES)[number];

/* ── Documentos (§15) ──────────────────────────────────────────────── */
export const DOCUMENT_STATUSES = [
  'Vigente',
  'Próximo a vencer',
  'Vencido',
  'Faltante',
  'Observado',
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/* ── Operaciones (§12) ─────────────────────────────────────────────── */
export const OPERATION_TYPES = ['Recepción', 'Despacho', 'Traslado', 'Venta', 'Ajuste'] as const;
export type OperationType = (typeof OPERATION_TYPES)[number];

export const OPERATION_STATUSES = [
  'Programada',
  'En tránsito',
  'Recibida',
  'Cerrada',
  'Observada',
  'Anulada',
] as const;
export type OperationStatus = (typeof OPERATION_STATUSES)[number];

/* ── Volúmenes (§14) ───────────────────────────────────────────────── */
export const VOLUME_DIRECTIONS = ['ingreso', 'salida', 'ajuste'] as const;
export type VolumeDirection = (typeof VOLUME_DIRECTIONS)[number];

/* ── Producto y calidad (§22) ──────────────────────────────────────── */
export const QUALITY_STATUSES = ['Conforme', 'Observado', 'Crítico'] as const;
export type QualityStatus = (typeof QUALITY_STATUSES)[number];

/* ─ Alertas (§25) ─────────────────────────────────────────────────── */
export const ALERT_TYPES = [
  'Documental',
  'Operativa',
  'Volumétrica',
  'Declarativa',
  'Seguridad',
  'Incidencia',
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_STATUSES = ['Abierta', 'Atendida', 'Escalada'] as const;
export type AlertStatus = (typeof ALERT_STATUSES)[number];

/* ── Declaraciones (§17) ───────────────────────────────────────────── */
export const DECLARATION_STATUSES = ['Borrador', 'Validada', 'Observada', 'Presentada'] as const;
export type DeclarationStatus = (typeof DECLARATION_STATUSES)[number];

/* ── Controles operativos de campo (§10) ───────────────────────────── */
export const CONTROL_STATUSES = ['Programado', 'En ejecución', 'Cerrado', 'Escalado'] as const;
export type ControlStatus = (typeof CONTROL_STATUSES)[number];
