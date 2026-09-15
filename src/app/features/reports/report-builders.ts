import { AdminGoStore } from '@core/services/admin-go.store';
import {
  AgDocument,
  Alert,
  ControlTowerKpis,
  Declaration,
  Incident,
  Operation,
  Plant,
  QualityControl,
  Station,
  Tank,
} from '@core/models/entities';
import { DocumentStatus, QualityStatus } from '@core/models/enums';
import { DATASET_DATE_ISO, datasetDate } from '@core/data/dataset-date';
import {
  classifyVolumeDifference,
  DifferenceLevel,
  volumeDifferencePercent,
} from '@core/rules/volume-difference';
import {
  daysUntil,
  formatDate,
  formatDateNumeric,
  formatDateTime,
  formatLiters,
  formatPercent,
} from '@shared/util/format';
import {
  labelForAlertSeverity,
  labelForComplianceLevel,
  labelForPlantStatus,
} from '@shared/util/status';
import { ReportColumn, ReportData } from '@shared/services/report-export.service';

/** Corte del dataset de demostración, derivado de su única fuente de verdad. */
export const REPORT_DATE_CUT = formatDateNumeric(DATASET_DATE_ISO);

const col = (header: string, align: 'left' | 'right' = 'left'): ReportColumn => ({
  header,
  align,
});

const num = col;

/** Etiqueta legible de cada grado de desviación volumétrica (§14). */
const LABEL_BY_DIFFERENCE_LEVEL: Record<DifferenceLevel, string> = {
  conforme: 'Conforme',
  observado: 'Observado',
  critico: 'Crítico',
};

/** Clasifica una diferencia % según el umbral configurable (§14). */
export function differenceLabel(percentDifference: number, thresholdPercent: number): string {
  return LABEL_BY_DIFFERENCE_LEVEL[classifyVolumeDifference(percentDifference, thresholdPercent)];
}

/** §26 — Reporte diario de planta. */
export function dailyPlantReport(plants: Plant[]): ReportData {
  const total = (pick: (plant: Plant) => number): number =>
    plants.reduce((sum, plant) => sum + pick(plant), 0);

  return {
    slug: 'reporte-diario-planta',
    title: 'Reporte diario de planta',
    section: '§26',
    subtitle: `Corte ${REPORT_DATE_CUT} · Red nacional`,
    columns: [
      col('Código'),
      col('Planta'),
      col('Recibido hoy', 'right'),
      col('Despachado hoy', 'right'),
      col('Saldo teórico', 'right'),
      col('Saldo físico', 'right'),
      col('Cisternas dentro', 'right'),
      col('Operaciones abiertas', 'right'),
      col('Último control'),
    ],
    rows: plants.map((plant) => [
      plant.code,
      `${plant.name} (${plant.city})`,
      formatLiters(plant.receivedToday),
      formatLiters(plant.dispatchedToday),
      formatLiters(plant.theoreticalBalance),
      formatLiters(plant.physicalBalance),
      String(plant.cisternsInside),
      String(plant.openOperations),
      formatDateTime(plant.lastControlAt),
    ]),
    foot: [
      [
        'TOTAL',
        `${plants.length} plantas`,
        formatLiters(total((p) => p.receivedToday)),
        formatLiters(total((p) => p.dispatchedToday)),
        formatLiters(total((p) => p.theoreticalBalance)),
        formatLiters(total((p) => p.physicalBalance)),
        String(total((p) => p.cisternsInside)),
        String(total((p) => p.openOperations)),
        '',
      ],
    ],
  };
}

/** §26/§12 — Reporte de operaciones. */
export function operationsReport(operations: Operation[]): ReportData {
  const totalDocumented = operations.reduce((sum, o) => sum + o.documentedVolume, 0);
  const totalReceived = operations.reduce((sum, o) => sum + o.receivedVolume, 0);

  return {
    slug: 'operaciones',
    title: 'Reporte de operaciones',
    section: '§12',
    subtitle: `Corte ${REPORT_DATE_CUT}`,
    columns: [
      col('Identificador'),
      col('Tipo'),
      col('Producto'),
      col('Origen'),
      col('Destino'),
      col('Cisterna'),
      col('Conductor'),
      col('Programado', 'right'),
      col('Documentado', 'right'),
      col('Recibido', 'right'),
      col('Estado'),
    ],
    rows: operations.map((operation) => [
      operation.code,
      operation.type,
      operation.product,
      operation.origin,
      operation.destination,
      operation.cisternPlate,
      operation.driverName,
      formatLiters(operation.scheduledVolume),
      formatLiters(operation.documentedVolume),
      formatLiters(operation.receivedVolume),
      operation.status,
    ]),
    foot: [
      [
        'TOTAL',
        `${operations.length} operaciones`,
        '',
        '',
        '',
        '',
        '',
        formatLiters(operations.reduce((sum, o) => sum + o.scheduledVolume, 0)),
        formatLiters(totalDocumented),
        formatLiters(totalReceived),
        '',
      ],
    ],
  };
}

/** §26/§20 — Estaciones de servicio. */
export function stationsReport(stations: Station[]): ReportData {
  return {
    slug: 'estaciones',
    title: 'Reporte de estaciones de servicio',
    section: '§20',
    subtitle: `Corte ${REPORT_DATE_CUT}`,
    columns: [
      col('Código'),
      col('Estación'),
      col('Ciudad'),
      col('Encargado'),
      num('Tanques', 'right'),
      num('Inventario', 'right'),
      num('Recibido hoy', 'right'),
      num('Despachado hoy', 'right'),
      col('Estado'),
    ],
    rows: stations.map((station) => [
      station.code,
      station.name,
      station.city,
      station.manager,
      String(station.tanks),
      formatLiters(station.inventory),
      formatLiters(station.receivedToday),
      formatLiters(station.dispatchedToday),
      labelForPlantStatus(station.status),
    ]),
    foot: [
      [
        'TOTAL',
        `${stations.length} EESS`,
        '',
        '',
        String(stations.reduce((sum, s) => sum + s.tanks, 0)),
        formatLiters(stations.reduce((sum, s) => sum + s.inventory, 0)),
        formatLiters(stations.reduce((sum, s) => sum + s.receivedToday, 0)),
        formatLiters(stations.reduce((sum, s) => sum + s.dispatchedToday, 0)),
        '',
      ],
    ],
  };
}

/** §26/§21 — Inventario de tanques con diferencia. */
export function tanksReport(tanks: Tank[]): ReportData {
  const difference = (tank: Tank): number => tank.physicalVolume - tank.theoreticalVolume;

  return {
    slug: 'inventario-tanques',
    title: 'Reporte de inventario de tanques',
    section: '§21',
    subtitle: `Corte ${REPORT_DATE_CUT}`,
    columns: [
      col('Tanque'),
      col('Producto'),
      num('Capacidad', 'right'),
      num('Volumen físico', 'right'),
      num('Volumen calculado', 'right'),
      num('Diferencia', 'right'),
      col('Última medición'),
    ],
    rows: tanks.map((tank) => [
      tank.code,
      tank.product,
      formatLiters(tank.capacity),
      formatLiters(tank.physicalVolume),
      formatLiters(tank.theoreticalVolume),
      formatLiters(difference(tank)),
      formatDateTime(tank.lastMeasuredAt),
    ]),
    foot: [
      [
        'TOTAL',
        `${tanks.length} tanques`,
        formatLiters(tanks.reduce((sum, t) => sum + t.capacity, 0)),
        formatLiters(tanks.reduce((sum, t) => sum + t.physicalVolume, 0)),
        formatLiters(tanks.reduce((sum, t) => sum + t.theoreticalVolume, 0)),
        formatLiters(tanks.reduce((sum, t) => sum + difference(t), 0)),
        '',
      ],
    ],
  };
}

/** §26/§15 — Vencimientos documentales. */
export function documentsReport(
  documents: AgDocument[],
  warningDays: number,
  reference: Date = datasetDate(),
): ReportData {
  const classified = classifiedDocuments(documents, warningDays, reference);
  const count = (status: DocumentStatus): number =>
    classified.filter((item) => item.status === status).length;

  return {
    slug: 'vencimientos-documentales',
    title: 'Reporte de vencimientos documentales',
    section: '§15',
    subtitle: `Corte ${REPORT_DATE_CUT} · vigencia configurable ${warningDays} días`,
    columns: [
      col('Código'),
      col('Documento'),
      col('Categoría'),
      col('Responsable'),
      col('Emisión'),
      col('Vence'),
      num('Días', 'right'),
      col('Estado'),
    ],
    rows: classified.map(({ document, days, status }) => [
      document.code,
      document.name,
      document.category,
      document.responsible,
      formatDate(document.issuedAt),
      formatDate(document.expiresAt),
      days === null ? '—' : String(days),
      status,
    ]),
    foot: [
      [
        'TOTAL',
        `${documents.length} documentos`,
        '',
        '',
        '',
        '',
        '',
        `Vigentes: ${count('Vigente')} · Por vencer: ${count('Próximo a vencer')} · Vencidos: ${count('Vencido')}`,
      ],
    ],
  };
}

/** §26/§17 — Declaraciones presentadas y pendientes. */
export function declarationsReport(
  declarations: Declaration[],
  companyNames: Map<string, string>,
): ReportData {
  return {
    slug: 'declaraciones',
    title: 'Reporte de declaraciones',
    section: '§17',
    subtitle: `Corte ${REPORT_DATE_CUT}`,
    columns: [
      col('Declaración'),
      col('Empresa'),
      col('Periodo'),
      num('Operaciones', 'right'),
      num('Volumen', 'right'),
      num('Saldo de cierre', 'right'),
      num('Ajustes', 'right'),
      col('Validación'),
      col('Estado'),
      col('Presentada'),
    ],
    rows: declarations.map((declaration) => [
      declaration.code,
      companyNames.get(declaration.companyId) ?? declaration.companyId,
      declaration.period,
      String(declaration.operationIds.length),
      formatLiters(declaration.totalVolume),
      formatLiters(declaration.closingInventory),
      formatLiters(declaration.adjustments),
      labelForComplianceLevel(declaration.validation),
      declaration.status,
      formatDate(declaration.presentedAt),
    ]),
    foot: [
      [
        'TOTAL',
        `${declarations.length} declaraciones`,
        '',
        String(declarations.reduce((sum, d) => sum + d.operationIds.length, 0)),
        formatLiters(declarations.reduce((sum, d) => sum + d.totalVolume, 0)),
        formatLiters(declarations.reduce((sum, d) => sum + d.closingInventory, 0)),
        formatLiters(declarations.reduce((sum, d) => sum + d.adjustments, 0)),
        '',
        '',
        '',
      ],
    ],
  };
}

/** §26/§25 — Alertas e incidencias. */
export function alertsReport(alerts: Alert[], incidents: Incident[]): ReportData {
  const bySeverity = (severity: Alert['severity']): number =>
    alerts.filter((alert) => alert.severity === severity).length;

  const rows: string[][] = [
    ...alerts.map((alert) => [
      'Alerta',
      labelForAlertSeverity(alert.severity),
      alert.type,
      alert.message,
      alert.entityRef,
      formatDate(alert.createdAt),
      alert.status,
    ]),
    ...incidents.map((incident) => [
      'Incidencia',
      labelForAlertSeverity(incident.severity),
      incident.code,
      incident.description,
      incident.plantId ?? '—',
      formatDate(incident.openedAt),
      incident.status,
    ]),
  ];

  return {
    slug: 'alertas-e-incidencias',
    title: 'Reporte de alertas e incidencias',
    section: '§25',
    subtitle: `Corte ${REPORT_DATE_CUT}`,
    columns: [
      col('Origen'),
      col('Severidad'),
      col('Tipo / Código'),
      col('Descripción'),
      col('Referencia'),
      col('Fecha'),
      col('Estado'),
    ],
    rows,
    foot: [
      [
        'TOTAL',
        `${alerts.length} alertas · ${incidents.length} incidencias`,
        '',
        '',
        '',
        '',
        `Críticas: ${bySeverity('critical')}`,
      ],
    ],
  };
}

/** §26/§14 — Diferencias volumétricas con umbrales configurables. */
export function volumeDifferencesReport(tanks: Tank[], thresholdPercent: number): ReportData {
  const difference = (tank: Tank): number => tank.physicalVolume - tank.theoreticalVolume;
  const percent = (tank: Tank): number =>
    volumeDifferencePercent(difference(tank), tank.theoreticalVolume);
  const count = (label: string): number =>
    tanks.filter((tank) => differenceLabel(percent(tank), thresholdPercent) === label).length;

  return {
    slug: 'diferencias-volumetricas',
    title: 'Reporte de diferencias volumétricas',
    section: '§14',
    subtitle: `Corte ${REPORT_DATE_CUT} · umbral crítico ${formatPercent(thresholdPercent)}`,
    columns: [
      col('Tanque'),
      col('Producto'),
      num('Físico', 'right'),
      num('Teórico', 'right'),
      num('Diferencia', 'right'),
      num('Diferencia %', 'right'),
      col('Clasificación'),
    ],
    rows: tanks.map((tank) => [
      tank.code,
      tank.product,
      formatLiters(tank.physicalVolume),
      formatLiters(tank.theoreticalVolume),
      formatLiters(difference(tank)),
      formatPercent(percent(tank)),
      differenceLabel(percent(tank), thresholdPercent),
    ]),
    foot: [
      [
        'TOTAL',
        `${tanks.length} tanques`,
        formatLiters(tanks.reduce((sum, t) => sum + t.physicalVolume, 0)),
        formatLiters(tanks.reduce((sum, t) => sum + t.theoreticalVolume, 0)),
        formatLiters(tanks.reduce((sum, t) => sum + difference(t), 0)),
        '',
        `Conformes: ${count('Conforme')} · Observados: ${count('Observado')} · Críticos: ${count('Crítico')}`,
      ],
    ],
  };
}

/** §26/§22 — Controles de calidad y certificados. */
export function qualityReport(controls: QualityControl[]): ReportData {
  const byStatus = (status: QualityStatus): number =>
    controls.filter((control) => control.status === status).length;

  return {
    slug: 'calidad',
    title: 'Reporte de calidad y certificados',
    section: '§22',
    subtitle: `Corte ${REPORT_DATE_CUT}`,
    columns: [
      col('Control'),
      col('Producto'),
      col('Lote'),
      col('Tipo'),
      col('Resultado'),
      col('Certificado'),
      col('Fecha'),
      col('Estado'),
    ],
    rows: controls.map((control) => [
      control.code,
      control.product,
      control.lot,
      control.controlType,
      control.result,
      control.certificate ?? '—',
      formatDate(control.controlledAt),
      control.status,
    ]),
    foot: [
      [
        'TOTAL',
        `${controls.length} controles`,
        '',
        '',
        '',
        '',
        '',
        `Conformes: ${byStatus('Conforme')} · Observados: ${byStatus('Observado')} · Críticos: ${byStatus('Crítico')}`,
      ],
    ],
  };
}

/** §26/§8 — Resumen ejecutivo de la Torre de Control. */
export function executiveSummaryReport(
  kpis: ControlTowerKpis,
  thresholdPercent: number,
  warningDays: number,
): ReportData {
  return {
    slug: 'resumen-ejecutivo',
    title: 'Resumen ejecutivo — Torre de Control',
    section: '§8',
    subtitle: `Corte ${REPORT_DATE_CUT} · umbral crítico ${formatPercent(thresholdPercent)} · vigencia ${warningDays} días`,
    columns: [col('Indicador'), num('Valor', 'right')],
    rows: [
      [
        'Plantas monitoreadas',
        `${kpis.plantsTotal} (${kpis.plantsGreen} OK · ${kpis.plantsYellow} observadas · ${kpis.plantsRed} críticas)`,
      ],
      ['Volumen recibido hoy', formatLiters(kpis.receivedVolume)],
      ['Volumen despachado hoy', formatLiters(kpis.dispatchedVolume)],
      ['Inventario teórico', formatLiters(kpis.theoreticalInventory)],
      ['Inventario físico', formatLiters(kpis.physicalInventory)],
      [
        'Diferencia volumétrica',
        `${formatLiters(kpis.volumeDifference)} (${formatPercent(kpis.volumeDifferencePercent)})`,
      ],
      ['Operaciones abiertas', `${kpis.openOperations} (${kpis.observedOperations} observadas)`],
      ['Documentos por vencer', String(kpis.documentsExpiringSoon)],
      ['Documentos vencidos', String(kpis.documentsExpired)],
      ['Declaraciones pendientes', String(kpis.pendingDeclarations)],
      ['Alertas críticas activas', String(kpis.criticalAlerts)],
      ['Incidencias abiertas', String(kpis.openIncidents)],
      ['AdminScore promedio', String(kpis.adminScore)],
    ],
  };
}

/**
 * Clasificación documental según la vigencia configurada (§15, §26).
 * La fecha de referencia es inyectable para poder probar sin depender del
 * dataset de demostración.
 */
export function classifiedDocuments(
  documents: AgDocument[],
  warningDays: number,
  reference: Date = datasetDate(),
): { document: AgDocument; days: number | null; status: DocumentStatus }[] {
  return documents.map((document) => {
    const days = daysUntil(document.expiresAt, reference);
    let status: DocumentStatus = document.status;
    if (days !== null) {
      if (days < 0) {
        status = 'Vencido';
      } else if (days <= warningDays) {
        status = 'Próximo a vencer';
      } else {
        status = 'Vigente';
      }
    }
    return { document, days, status };
  });
}

/** Definición declarativa de cada reporte del catálogo (§26). */
export interface ReportDefinition {
  id: string;
  title: string;
  description: string;
  /** Texto del botón de exportación en la UI. */
  formats: ('pdf' | 'xlsx')[];
  /** Construye el reporte a partir del estado actual. */
  build: (store: AdminGoStore, options: ReportOptions) => ReportData;
}

/** Umbrales/configuración que afectan a los reportes (§14). */
export interface ReportOptions {
  thresholdPercent: number;
  warningDays: number;
}

/** Catálogo de reportes exportables (§26). */
export const REPORT_DEFS: ReportDefinition[] = [
  {
    id: 'executive',
    title: 'Resumen ejecutivo (Torre de Control)',
    description: 'KPIs consolidados de la red: semáforo, volúmenes, alertas y AdminScore.',
    formats: ['pdf', 'xlsx'],
    build: (store, options) =>
      executiveSummaryReport(store.kpis(), options.thresholdPercent, options.warningDays),
  },
  {
    id: 'daily-plant',
    title: 'Reporte diario por planta',
    description: 'Recepciones, despachos, saldos y control operativo de las 16 plantas.',
    formats: ['pdf', 'xlsx'],
    build: (store) => dailyPlantReport(store.plants()),
  },
  {
    id: 'operations',
    title: 'Operaciones documentadas',
    description: 'Operaciones con volúmenes programados, documentados y recibidos.',
    formats: ['pdf', 'xlsx'],
    build: (store) => operationsReport(store.operations()),
  },
  {
    id: 'stations',
    title: 'Estaciones de servicio',
    description: 'Inventario y movimiento del día por EESS de la red de clientes.',
    formats: ['pdf', 'xlsx'],
    build: (store) => stationsReport(store.stations()),
  },
  {
    id: 'tanks',
    title: 'Inventario de tanques',
    description: 'Medición física vs. calculada por tanque con su diferencia.',
    formats: ['pdf', 'xlsx'],
    build: (store) => tanksReport(store.tanks()),
  },
  {
    id: 'volume-differences',
    title: 'Diferencias volumétricas',
    description: 'Diferencias físico/teórico clasificadas con el umbral configurable (§14).',
    formats: ['pdf', 'xlsx'],
    build: (store, options) => volumeDifferencesReport(store.tanks(), options.thresholdPercent),
  },
  {
    id: 'documents',
    title: 'Vencimientos documentales',
    description: 'Expedientes por vencer y vencidos de clientes, vehículos e instalaciones.',
    formats: ['pdf', 'xlsx'],
    build: (store, options) => documentsReport(store.documents(), options.warningDays),
  },
  {
    id: 'declarations',
    title: 'Declaraciones',
    description: 'Declaraciones presentadas y pendientes con su validación CHECK ADMIN GO.',
    formats: ['pdf', 'xlsx'],
    build: (store) => {
      const names = new Map(
        store.companies().map((company): [string, string] => [company.id, company.name]),
      );
      return declarationsReport(store.declarations(), names);
    },
  },
  {
    id: 'alerts',
    title: 'Alertas e incidencias',
    description: 'Alertas críticas e incidencias abiertas con su trazabilidad.',
    formats: ['pdf', 'xlsx'],
    build: (store) => alertsReport(store.alerts(), store.incidents()),
  },
  {
    id: 'quality',
    title: 'Calidad y certificados',
    description: 'Controles de calidad, lotes y certificados por producto.',
    formats: ['pdf', 'xlsx'],
    build: (store) => qualityReport(store.qualityControls()),
  },
];
