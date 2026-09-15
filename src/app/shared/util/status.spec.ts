import {
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  CISTERN_STATUSES,
  COMPLIANCE_LEVELS,
  CONTROL_STATUSES,
  DECLARATION_STATUSES,
  DOCUMENT_STATUSES,
  OPERATION_STATUSES,
  PLANT_STATUSES,
  QUALITY_STATUSES,
} from '@core/models/enums';
import { Tone } from './format';
import {
  labelForAlertSeverity,
  labelForComplianceLevel,
  labelForPlantStatus,
  toneForAlertSeverity,
  toneForAlertStatus,
  toneForCisternStatus,
  toneForComplianceLevel,
  toneForControlStatus,
  toneForDeclarationStatus,
  toneForDocumentStatus,
  toneForOperationStatus,
  toneForPlantStatus,
  toneForQualityStatus,
  toneForVolumeDifference,
} from './status';

const VALID_TONES: Tone[] = ['ok', 'warn', 'danger', 'info', 'neutral'];

describe('mapas de estado → tono', () => {
  it('cubren todos los valores de cada catálogo sin dejar huecos', () => {
    for (const value of PLANT_STATUSES) {
      expect(VALID_TONES).toContain(toneForPlantStatus(value));
    }
    for (const value of DOCUMENT_STATUSES) {
      expect(VALID_TONES).toContain(toneForDocumentStatus(value));
    }
    for (const value of OPERATION_STATUSES) {
      expect(VALID_TONES).toContain(toneForOperationStatus(value));
    }
    for (const value of DECLARATION_STATUSES) {
      expect(VALID_TONES).toContain(toneForDeclarationStatus(value));
    }
    for (const value of COMPLIANCE_LEVELS) {
      expect(VALID_TONES).toContain(toneForComplianceLevel(value));
    }
    for (const value of CONTROL_STATUSES) {
      expect(VALID_TONES).toContain(toneForControlStatus(value));
    }
    for (const value of QUALITY_STATUSES) {
      expect(VALID_TONES).toContain(toneForQualityStatus(value));
    }
    for (const value of ALERT_SEVERITIES) {
      expect(VALID_TONES).toContain(toneForAlertSeverity(value));
    }
    for (const value of ALERT_STATUSES) {
      expect(VALID_TONES).toContain(toneForAlertStatus(value));
    }
    for (const value of CISTERN_STATUSES) {
      expect(VALID_TONES).toContain(toneForCisternStatus(value));
    }
  });

  it('asigna el semáforo esperado en los casos de negocio clave', () => {
    expect(toneForPlantStatus('green')).toBe('ok');
    expect(toneForPlantStatus('red')).toBe('danger');
    expect(toneForDocumentStatus('Vencido')).toBe('danger');
    expect(toneForDocumentStatus('Faltante')).toBe('danger');
    expect(toneForOperationStatus('Anulada')).toBe('neutral');
    expect(toneForOperationStatus('Observada')).toBe('warn');
    expect(toneForAlertSeverity('critical')).toBe('danger');
    expect(toneForAlertStatus('Atendida')).toBe('ok');
    expect(toneForCisternStatus('En ruta')).toBe('info');
    expect(toneForCisternStatus('Mantenimiento')).toBe('warn');
  });
});

describe('tono de diferencia volumétrica', () => {
  it('aplica el umbral configurable sobre el volumen de referencia (§14)', () => {
    // 300 L sobre 10.000 L = 3 % > 1,5 % → crítico
    expect(toneForVolumeDifference(300, 10_000, 1.5)).toBe('danger');
    // 100 L = 1 % → observado (mitad del umbral)
    expect(toneForVolumeDifference(100, 10_000, 1.5)).toBe('warn');
    // 50 L = 0,5 % → conforme
    expect(toneForVolumeDifference(50, 10_000, 1.5)).toBe('ok');
  });

  it('respeta un umbral distinto para el mismo volumen', () => {
    expect(toneForVolumeDifference(100, 10_000, 1.5)).toBe('warn');
    expect(toneForVolumeDifference(100, 10_000, 0.5)).toBe('danger');
  });

  it('no clasifica como crítico si no hay volumen de referencia', () => {
    expect(toneForVolumeDifference(9_999, 0, 1.5)).toBe('ok');
  });
});

describe('etiquetas legibles', () => {
  it('traducen el vocabulario técnico a lenguaje de negocio', () => {
    expect(labelForPlantStatus('green')).toBe('Operación normal');
    expect(labelForPlantStatus('yellow')).toBe('Con observaciones');
    expect(labelForComplianceLevel('observed')).toBe('Observado');
    expect(labelForAlertSeverity('critical')).toBe('Crítica');
  });
});
