import { Alert, Evidence, Incident, QualityControl } from '@core/models/entities';
import { CISTERNS, DOCUMENTS, OPERATIONS, PLANTS } from './mock-data';

/**
 * Evidencias, alertas, incidencias y controles de calidad (§10, §22, §25).
 * Datos de demostración del MVP.
 */

const pad = (n: number, size = 2): string => String(n).padStart(size, '0');

/* ── Evidencias fotográficas y documentales (§10) ───────────────── */
/** Controles existentes en `mock-compliance`; se referencian por id. */
const CONTROL_COUNT = 6;

export const EVIDENCES: Evidence[] = Array.from({ length: 30 }, (_, i) => {
  const operation = OPERATIONS[i % OPERATIONS.length];
  const isPhoto = i % 3 !== 0;
  // Una de cada cuatro evidencias respalda un expediente documental (§15).
  const documentIndex = i + 1;
  const documentId =
    i % 4 === 0 && documentIndex <= DOCUMENTS.length ? `doc-${documentIndex}` : null;
  return {
    id: `evd-${i + 1}`,
    kind: isPhoto ? 'photo' : 'pdf',
    fileName: `${operation.code}-${isPhoto ? 'evidencia' : 'reporte'}-${pad(i + 1)}.${isPhoto ? 'jpg' : 'pdf'}`,
    description: isPhoto
      ? 'Registro fotográfico de precintos y medición de tanque.'
      : 'Reporte de control operativo firmado.',
    capturedAt: operation.updatedAt,
    capturedBy: i % 2 === 0 ? 'Nicolás Vargas' : 'Ramiro Loza',
    operationId: operation.id,
    plantId: operation.plantId,
    tankId: operation.tankId,
    documentId,
    // La mitad del material de campo pertenece a un control operativo (§10).
    controlId: i % 2 === 0 ? `ctl-${(i % CONTROL_COUNT) + 1}` : null,
  };
});

/* ── Alertas (§25) ──────────────────────────────────────────────── */
type AlertSeed = [
  type: Alert['type'],
  severity: Alert['severity'],
  status: Alert['status'],
  message: string,
  entityRef: string,
  plantIdx: number,
  createdAt: string,
];

const ALERT_SEEDS: AlertSeed[] = [
  [
    'Documental',
    'warning',
    'Abierta',
    'Póliza de seguro CIS-1123-ABC vence en 18 días',
    'AG-DI-2026-000002',
    -1,
    '2026-09-13T08:10:00',
  ],
  [
    'Documental',
    'critical',
    'Abierta',
    'Autorización EESS-005 vencida',
    'EESS-005',
    -1,
    '2026-09-12T16:40:00',
  ],
  [
    'Volumétrica',
    'critical',
    'Abierta',
    'Diferencia volumétrica fuera de parámetro',
    'PL-PTS',
    4,
    '2026-09-13T07:05:00',
  ],
  [
    'Volumétrica',
    'warning',
    'Abierta',
    'Diferencia de −380 L en traslado a Uyuni',
    'AG-DI-2026-000005',
    4,
    '2026-09-12T19:20:00',
  ],
  [
    'Operativa',
    'warning',
    'Abierta',
    'Operación sin cierre por más de 24 horas',
    'AG-DI-2026-000002',
    0,
    '2026-09-13T06:00:00',
  ],
  [
    'Operativa',
    'info',
    'Atendida',
    'Recepción programada confirmada en PL-LPB',
    'AG-DI-2026-000007',
    2,
    '2026-09-13T05:30:00',
  ],
  [
    'Declarativa',
    'warning',
    'Abierta',
    'Periodo agosto pendiente de declaración',
    'cmp-1',
    -1,
    '2026-09-11T10:15:00',
  ],
  [
    'Declarativa',
    'critical',
    'Escalada',
    'Periodo julio observado por requisito faltante',
    'cmp-1',
    -1,
    '2026-09-11T10:18:00',
  ],
  [
    'Seguridad',
    'critical',
    'Abierta',
    'Intento de acceso fuera de horario operativo',
    'usr-8',
    -1,
    '2026-09-12T23:58:00',
  ],
  [
    'Incidencia',
    'warning',
    'Abierta',
    'Precinto con código ilegible en despacho',
    'AG-DI-2026-000011',
    12,
    '2026-09-13T09:40:00',
  ],
  [
    'Incidencia',
    'info',
    'Atendida',
    'Derrame menor contenido en PL-RIB',
    'PL-RIB',
    13,
    '2026-09-10T14:05:00',
  ],
  [
    'Documental',
    'warning',
    'Abierta',
    'Certificado de calidad vence en 23 días',
    'AG-DI-2026-000001',
    3,
    '2026-09-13T08:12:00',
  ],
];

export const ALERTS: Alert[] = ALERT_SEEDS.map(
  ([type, severity, status, message, entityRef, plantIdx, createdAt], i) => ({
    id: `alt-${i + 1}`,
    type,
    severity,
    status,
    message,
    entityRef,
    plantId: plantIdx >= 0 ? PLANTS[plantIdx].id : null,
    stationId: null,
    // Las alertas del dataset son registros curados a mano; las derivadas por
    // reglas las genera `deriveAlerts` con identificadores estables (§25).
    source: 'manual' as const,
    createdAt,
  }),
);

/* ── Incidencias (§25) ──────────────────────────────────────────── */
type IncidentSeed = [
  plantIdx: number,
  operationIdx: number,
  description: string,
  severity: Incident['severity'],
  status: Incident['status'],
  openedAt: string,
];

const INCIDENT_SEEDS: IncidentSeed[] = [
  [
    4,
    4,
    'Diferencia de 380 L entre volumen documentado y recibido en traslado a Uyuni.',
    'critical',
    'Abierta',
    '2026-09-12T19:25:00',
  ],
  [
    13,
    -1,
    'Derrame menor contenido durante maniobra de despacho.',
    'warning',
    'Cerrada',
    '2026-09-10T14:00:00',
  ],
  [
    12,
    10,
    'Precinto con código ilegible, requiere verificación física.',
    'warning',
    'En revisión',
    '2026-09-13T09:45:00',
  ],
  [
    2,
    -1,
    'Falta de documento de habilitación de cisterna CIS-5566-FGH.',
    'critical',
    'Abierta',
    '2026-09-11T11:30:00',
  ],
  [
    7,
    7,
    'Recepción con volumen 130 L por debajo del documentado.',
    'info',
    'Cerrada',
    '2026-09-12T18:10:00',
  ],
];

export const INCIDENTS: Incident[] = INCIDENT_SEEDS.map(
  ([plantIdx, operationIdx, description, severity, status, openedAt], i) => ({
    id: `inc-${i + 1}`,
    code: `INC-2026-${String(i + 1).padStart(4, '0')}`,
    plantId: plantIdx >= 0 ? PLANTS[plantIdx].id : null,
    operationId: operationIdx >= 0 ? OPERATIONS[operationIdx].id : null,
    cisternId: i % 3 === 0 ? CISTERNS[i % CISTERNS.length].id : null,
    controlId: i % 2 === 0 ? `ctl-${(i % CONTROL_COUNT) + 1}` : null,
    description,
    severity,
    openedAt,
    closedAt: status === 'Cerrada' ? '2026-09-12T09:00:00' : null,
    status,
  }),
);

/* ── Controles de producto y calidad (§22) ──────────────────────── */
type QualitySeed = [
  plantIdx: number,
  product: string,
  controlType: string,
  result: string,
  status: QualityControl['status'],
];

const QUALITY_SEEDS: QualitySeed[] = [
  [3, 'Diésel Importado', 'Verificación de densidad API', 'Cumple especificación', 'Conforme'],
  [0, 'Diésel Importado', 'Muestra de laboratorio', 'Azufre dentro de rango', 'Conforme'],
  [4, 'Diésel Importado', 'Verificación de color y aspecto', 'Turbidez leve', 'Observado'],
  [8, 'Gasolina Especial', 'Verificación de octanaje', 'Octanaje 91.2', 'Conforme'],
  [12, 'Gasolina Especial', 'Muestra de laboratorio', 'Contaminación con agua', 'Crítico'],
  [6, 'Diésel Importado', 'Certificado de lote', 'Certificado vigente', 'Conforme'],
];

export const QUALITY_CONTROLS: QualityControl[] = QUALITY_SEEDS.map(
  ([plantIdx, product, controlType, result, status], i) => ({
    id: `qct-${i + 1}`,
    code: `QC-2026-${String(i + 1).padStart(4, '0')}`,
    product,
    lot: `LOTE-${8800 + i * 7}`,
    plantId: PLANTS[plantIdx].id,
    controlledAt: `2026-09-${pad(9 + i)}T10:20:00`,
    controlType,
    sampleRef: i % 2 === 0 ? `MTR-${200 + i}` : null,
    sealCode: `PRC-${6000 + i}`,
    certificate: i % 3 === 0 ? `CERT-${3300 + i}` : null,
    result,
    observation:
      status === 'Conforme'
        ? 'Sin observaciones.'
        : 'Requiere confirmación con laboratorio externo.',
    status,
    evidenceId: `evd-${i + 1}`,
  }),
);
