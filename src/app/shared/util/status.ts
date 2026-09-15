import {
  AlertSeverity,
  AlertStatus,
  CisternStatus,
  ComplianceLevel,
  ControlStatus,
  DeclarationStatus,
  DocumentStatus,
  OperationStatus,
  PlantStatus,
  QualityStatus,
} from '@core/models/enums';
import {
  DifferenceLevel,
  classifyVolumeDifference,
  volumeDifferencePercent,
} from '@core/rules/volume-difference';
import { Tone } from './format';

/**
 * Traducción de cada vocabulario de estado del dominio a su presentación:
 * tono visual (semáforo) y etiqueta legible.
 *
 * Cada mapa es un `Record` exhaustivo sobre la unión correspondiente, de modo
 * que **añadir un estado en `enums.ts` rompe la compilación hasta clasificarlo
 * aquí**. Esa garantía es la razón de tener un mapa por dominio en lugar de una
 * única función que aceptara `string` y mezclara vocabularios.
 */

const TONE_BY_PLANT_STATUS: Record<PlantStatus, Tone> = {
  green: 'ok',
  yellow: 'warn',
  red: 'danger',
};

const TONE_BY_DOCUMENT_STATUS: Record<DocumentStatus, Tone> = {
  Vigente: 'ok',
  'Próximo a vencer': 'warn',
  Vencido: 'danger',
  Faltante: 'danger',
  Observado: 'warn',
};

const TONE_BY_OPERATION_STATUS: Record<OperationStatus, Tone> = {
  Programada: 'info',
  'En tránsito': 'info',
  Recibida: 'ok',
  Cerrada: 'ok',
  Observada: 'warn',
  Anulada: 'neutral',
};

const TONE_BY_DECLARATION_STATUS: Record<DeclarationStatus, Tone> = {
  Borrador: 'warn',
  Validada: 'ok',
  Observada: 'warn',
  Presentada: 'ok',
};

const TONE_BY_COMPLIANCE_LEVEL: Record<ComplianceLevel, Tone> = {
  ok: 'ok',
  observed: 'warn',
  critical: 'danger',
};

const TONE_BY_CONTROL_STATUS: Record<ControlStatus, Tone> = {
  Programado: 'info',
  'En ejecución': 'warn',
  Cerrado: 'ok',
  Escalado: 'danger',
};

const TONE_BY_QUALITY_STATUS: Record<QualityStatus, Tone> = {
  Conforme: 'ok',
  Observado: 'warn',
  Crítico: 'danger',
};

const TONE_BY_ALERT_SEVERITY: Record<AlertSeverity, Tone> = {
  info: 'info',
  warning: 'warn',
  critical: 'danger',
};

const TONE_BY_ALERT_STATUS: Record<AlertStatus, Tone> = {
  Abierta: 'danger',
  Atendida: 'ok',
  Escalada: 'danger',
};

const TONE_BY_CISTERN_STATUS: Record<CisternStatus, Tone> = {
  Disponible: 'ok',
  'En ruta': 'info',
  'En planta': 'ok',
  Mantenimiento: 'warn',
};

const TONE_BY_DIFFERENCE_LEVEL: Record<DifferenceLevel, Tone> = {
  conforme: 'ok',
  observado: 'warn',
  critico: 'danger',
};

const LABEL_BY_PLANT_STATUS: Record<PlantStatus, string> = {
  green: 'Operación normal',
  yellow: 'Con observaciones',
  red: 'Crítico',
};

const LABEL_BY_COMPLIANCE_LEVEL: Record<ComplianceLevel, string> = {
  ok: 'OK',
  observed: 'Observado',
  critical: 'Crítico',
};

const LABEL_BY_ALERT_SEVERITY: Record<AlertSeverity, string> = {
  info: 'Informativa',
  warning: 'Advertencia',
  critical: 'Crítica',
};

export function toneForPlantStatus(status: PlantStatus): Tone {
  return TONE_BY_PLANT_STATUS[status];
}

export function toneForDocumentStatus(status: DocumentStatus): Tone {
  return TONE_BY_DOCUMENT_STATUS[status];
}

export function toneForOperationStatus(status: OperationStatus): Tone {
  return TONE_BY_OPERATION_STATUS[status];
}

export function toneForDeclarationStatus(status: DeclarationStatus): Tone {
  return TONE_BY_DECLARATION_STATUS[status];
}

export function toneForComplianceLevel(level: ComplianceLevel): Tone {
  return TONE_BY_COMPLIANCE_LEVEL[level];
}

export function toneForControlStatus(status: ControlStatus): Tone {
  return TONE_BY_CONTROL_STATUS[status];
}

export function toneForQualityStatus(status: QualityStatus): Tone {
  return TONE_BY_QUALITY_STATUS[status];
}

export function toneForAlertSeverity(severity: AlertSeverity): Tone {
  return TONE_BY_ALERT_SEVERITY[severity];
}

export function toneForAlertStatus(status: AlertStatus): Tone {
  return TONE_BY_ALERT_STATUS[status];
}

export function toneForCisternStatus(status: CisternStatus): Tone {
  return TONE_BY_CISTERN_STATUS[status];
}

export function toneForDifferenceLevel(level: DifferenceLevel): Tone {
  return TONE_BY_DIFFERENCE_LEVEL[level];
}

/**
 * Tono del semáforo de una diferencia volumétrica (§14). Compone la regla de
 * negocio con el umbral configurable, de modo que la UI y los reportes
 * clasifiquen con el mismo criterio.
 */
export function toneForVolumeDifference(
  difference: number,
  referenceVolume: number,
  thresholdPercent: number,
): Tone {
  const percent = volumeDifferencePercent(difference, referenceVolume);
  return toneForDifferenceLevel(classifyVolumeDifference(percent, thresholdPercent));
}

export function labelForPlantStatus(status: PlantStatus): string {
  return LABEL_BY_PLANT_STATUS[status];
}

export function labelForComplianceLevel(level: ComplianceLevel): string {
  return LABEL_BY_COMPLIANCE_LEVEL[level];
}

export function labelForAlertSeverity(severity: AlertSeverity): string {
  return LABEL_BY_ALERT_SEVERITY[severity];
}
