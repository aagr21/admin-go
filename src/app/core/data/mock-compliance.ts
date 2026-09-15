import {
  AuditLog,
  Declaration,
  InventoryMovement,
  OperationalControl,
  TankMeasurement,
  Volume,
} from '@core/models/entities';
import { COMPANIES, DOCUMENTS, OPERATIONS, PLANTS, TANKS } from './mock-data';
import { EVIDENCES, INCIDENTS, QUALITY_CONTROLS } from './mock-activity';

/**
 * Declaraciones, controles operativos, auditoría y movimientos volumétricos
 * (§14, §17, §27). Datos de demostración del MVP.
 */

const pad = (n: number, size = 2): string => String(n).padStart(size, '0');

/* ── Declaraciones y planillas (§17, §18) ───────────────────────── */
type DeclarationSeed = [
  period: string,
  operationsCount: number,
  totalVolume: number,
  closingInventory: number,
  adjustments: number,
  documentsCount: number,
  validation: Declaration['validation'],
  status: Declaration['status'],
  presentedAt: string | null,
];

const DECLARATION_SEEDS: DeclarationSeed[] = [
  ['2026-07', 42, 1_284_000, 968_000, 1_200, 38, 'critical', 'Observada', null],
  ['2026-08', 55, 1_612_500, 1_045_000, 900, 51, 'observed', 'Validada', null],
  ['2026-09', 37, 1_098_300, 1_012_400, 0, 34, 'ok', 'Borrador', null],
  ['2026-06', 48, 1_451_700, 902_300, 600, 46, 'ok', 'Presentada', '2026-07-12T15:00:00'],
  ['2026-05', 44, 1_320_900, 878_100, 450, 44, 'ok', 'Presentada', '2026-06-11T14:30:00'],
];

const DECLARATION_COMPANY = COMPANIES[0].id;
const COMPANY_OPERATION_IDS = OPERATIONS.filter(
  (operation) => operation.companyId === DECLARATION_COMPANY,
).map((operation) => operation.id);
const COMPANY_DOCUMENT_IDS = DOCUMENTS.filter(
  (document) => document.companyId === DECLARATION_COMPANY,
).map((document) => document.id);

export const DECLARATIONS: Declaration[] = DECLARATION_SEEDS.map(
  (
    [
      period,
      operationsCount,
      totalVolume,
      closingInventory,
      adjustments,
      documentsCount,
      validation,
      status,
      presentedAt,
    ],
    i,
  ) => ({
    id: `dcl-${i + 1}`,
    code: `DEC-AND-${period}`,
    companyId: DECLARATION_COMPANY,
    period,
    // Las listas son la fuente de verdad; los conteos se derivan de ellas (§17).
    operationIds: COMPANY_OPERATION_IDS.slice(0, operationsCount),
    documentIds: COMPANY_DOCUMENT_IDS.slice(0, documentsCount),
    totalVolume,
    closingInventory,
    adjustments,
    validation,
    status,
    responsible: 'Iván Terceros',
    presentedAt,
    version: 1 + (i % 2),
  }),
);

/* ── Control operativo de planta (§10, §11) ─────────────────────── */
type ControlSeed = [
  plantIdx: number,
  shift: OperationalControl['shift'],
  initial: number,
  received: number,
  dispatched: number,
  status: OperationalControl['status'],
];

const CONTROL_SEEDS: ControlSeed[] = [
  [0, 'Mañana', 812_000, 52_400, 38_900, 'Cerrado'],
  [3, 'Mañana', 905_000, 34_000, 0, 'Cerrado'],
  [4, 'Tarde', 612_000, 0, 27_500, 'Escalado'],
  [13, 'Tarde', 498_000, 18_000, 16_500, 'Cerrado'],
  [7, 'Noche', 733_000, 0, 20_400, 'En ejecución'],
  [12, 'Mañana', 686_000, 17_000, 16_580, 'Cerrado'],
];

export const OPERATIONAL_CONTROLS: OperationalControl[] = CONTROL_SEEDS.map(
  ([plantIdx, shift, initialVolume, receivedVolume, dispatchedVolume, status], i) => {
    const plant = PLANTS[plantIdx];
    const id = `ctl-${i + 1}`;
    const controlDate = `2026-09-${pad(12 + (i % 2))}`;
    const closed = status === 'Cerrado' || status === 'Escalado';
    return {
      id,
      code: `CTL-2026-${String(i + 1).padStart(6, '0')}`,
      plantId: plant.id,
      scheduledAt: `${controlDate}T06:30:00`,
      controlDate,
      shift,
      supervisor: i % 2 === 0 ? 'Ramiro Loza' : 'Nicolás Vargas',
      product: 'Diésel Importado',
      initialVolume,
      receivedVolume,
      dispatchedVolume,
      balance: initialVolume + receivedVolume - dispatchedVolume,
      cisternsIn: receivedVolume > 0 ? 2 : 0,
      cisternsOut: dispatchedVolume > 0 ? 2 : 0,
      sealsVerified: 4 + i,
      documentsVerified: 6 + i,
      // Las evidencias e incidencias se resuelven desde su propio listado (§10).
      evidenceIds: EVIDENCES.filter((evidence) => evidence.controlId === id).map((e) => e.id),
      incidentIds: INCIDENTS.filter((incident) => incident.controlId === id).map((n) => n.id),
      qualityControlIds: i % 2 === 0 ? [QUALITY_CONTROLS[i % QUALITY_CONTROLS.length].id] : [],
      observation:
        status === 'Escalado'
          ? 'Diferencia volumétrica fuera de umbral, escalada al gerente.'
          : 'Control sin observaciones mayores.',
      status,
      arrivedAt: `${controlDate}T07:05:00`,
      closedAt: closed ? `${controlDate}T17:40:00` : null,
      reportDocumentId: closed ? `doc-${(i % DOCUMENTS.length) + 1}` : null,
    };
  },
);

/* ── Auditoría (§27) ────────────────────────────────────────────── */
export const AUDIT_LOGS: AuditLog[] = [
  [
    'operador01',
    'AG-DI-2026-000148',
    'Volumen recibido',
    '34.800 L',
    '34.850 L',
    'Modificación autorizada',
  ],
  [
    'operador01',
    'AG-DI-2026-000149',
    'Volumen despachado',
    '28.000 L',
    '28.000 L',
    'Registro inicial',
  ],
  ['sup.campo01', 'AG-DI-2026-000148', 'Estado', 'En tránsito', 'Recibida', 'Cambio de estado'],
  [
    'regulatorio.andina',
    'DEC-AND-2026-08',
    'Estado',
    'Borrador',
    'Validada',
    'Validación de documento',
  ],
  ['gerente.andina', 'PL-PTS', 'Umbral de diferencia', '2.0 %', '1.5 %', 'Ajuste de parámetro'],
  [
    'admin',
    'usr-6',
    'Rol',
    'Operador de campo',
    'Supervisor operativo AdminGo',
    'Cambio de privilegio',
  ],
  ['mrojas', 'doc-2', 'Versión', '1', '2', 'Nueva versión documental'],
  [
    'auditor.01',
    'AG-DI-2026-000151',
    'Observación',
    '—',
    'Diferencia volumétrica',
    'Registro de observación',
  ],
].map(([username, entityRef, field, previousValue, newValue, action], i) => ({
  id: `aud-${i + 1}`,
  username: username as string,
  at: `2026-09-${pad(12 - (i % 4))}T${pad(9 + i)}:${pad(10 + i)}:00`,
  entityType: 'operación',
  entityRef: entityRef as string,
  field: field as string,
  previousValue: previousValue as string,
  newValue: newValue as string,
  action: action as string,
}));

/* ── Volúmenes por operación (§14) ─────────────────────────────── */
export const VOLUMES: Volume[] = OPERATIONS.flatMap((operation, i) => {
  const rows: Volume[] = [
    {
      id: `vol-${i + 1}-a`,
      operationId: operation.id,
      plantId: operation.plantId,
      stationId: operation.stationId,
      direction: operation.type === 'Recepción' ? 'ingreso' : 'salida',
      quantity: operation.documentedVolume,
      recordedAt: operation.scheduledAt,
      authorizedBy: null,
    },
  ];
  if (operation.receivedVolume > 0) {
    rows.push({
      id: `vol-${i + 1}-b`,
      operationId: operation.id,
      plantId: operation.plantId,
      stationId: operation.stationId,
      direction: 'ingreso',
      quantity: operation.receivedVolume,
      recordedAt: operation.updatedAt,
      authorizedBy: null,
    });
  }
  if (operation.type === 'Ajuste') {
    rows.push({
      id: `vol-${i + 1}-c`,
      operationId: operation.id,
      plantId: operation.plantId,
      stationId: operation.stationId,
      direction: 'ajuste',
      quantity: operation.documentedVolume,
      recordedAt: operation.updatedAt,
      authorizedBy: 'gerente.andina',
    });
  }
  return rows;
});

/* ── Movimientos de inventario por tanque (§14) ─────────────────── */
export const INVENTORY_MOVEMENTS: InventoryMovement[] = TANKS.flatMap((tank, i) =>
  [0, 1, 2].map((k) => {
    const quantity = 4_000 + ((i + k) % 6) * 1_500;
    const direction: InventoryMovement['direction'] = k === 2 ? 'salida' : 'ingreso';
    return {
      id: `mov-${i + 1}-${k + 1}`,
      tankId: tank.id,
      operationId: OPERATIONS[(i + k) % OPERATIONS.length].id,
      direction,
      quantity,
      balanceAfter: tank.physicalVolume + (k - 1) * quantity,
      recordedAt: `2026-09-${pad(10 + k)}T${pad(7 + k * 3)}:30:00`,
    };
  }),
);

/* ── Mediciones de tanque (§21) ─────────────────────────────────── */
export const TANK_MEASUREMENTS: TankMeasurement[] = TANKS.flatMap((tank, i) =>
  [0, 1].map((k) => {
    const physicalVolume = tank.physicalVolume - k * (120 + (i % 4) * 40);
    const calculatedVolume = physicalVolume + (k === 0 ? 90 : -60);
    return {
      id: `tms-${i + 1}-${k + 1}`,
      tankId: tank.id,
      measuredAt: `2026-09-${pad(11 + k)}T08:${pad(15 + i)}:00`,
      physicalVolume,
      calculatedVolume,
      difference: physicalVolume - calculatedVolume,
      evidenceId: `evd-${(i + k + 1) % 30 || 30}`,
    };
  }),
);
