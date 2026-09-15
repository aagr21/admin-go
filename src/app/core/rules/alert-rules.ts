import { AgDocument, Alert, Declaration, Incident, Operation, Tank } from '@core/models/entities';
import { AlertSeverity, AlertType } from '@core/models/enums';
import { daysUntil } from '@shared/util/format';
import { documentStatusOf } from './document-status';
import { classifyVolumeDifference, volumeDifferencePercent } from './volume-difference';

/**
 * Generación de alertas por reglas (§25).
 *
 * El sistema no debe depender de que alguien registre una alerta a mano: los
 * eventos documentales, operativos, volumétricos y declarativos se derivan del
 * propio estado. La función es pura y determinista; los identificadores son
 * estables (`alt-regla-<tipo>-<referencia>`) para que al recalcular se
 * **conserve el estado** de las alertas ya atendidas (§27).
 */

export interface AlertRuleInput {
  documents: readonly AgDocument[];
  operations: readonly Operation[];
  tanks: readonly Tank[];
  declarations: readonly Declaration[];
  incidents: readonly Incident[];
  /** Días de aviso previo de vencimiento (§14). */
  warningDays: number;
  /** Umbral de diferencia volumétrica (§14). */
  thresholdPercent: number;
  /** Días sin cierre tras los cuales una operación alerta (§25). */
  stalledOperationDays: number;
  reference: Date;
}

const OPEN_STATUSES: readonly Operation['status'][] = ['Programada', 'En tránsito', 'Recibida'];

export function deriveAlerts(input: AlertRuleInput): Alert[] {
  return [
    ...documentAlerts(input),
    ...operationAlerts(input),
    ...volumeAlerts(input),
    ...declarationAlerts(input),
    ...incidentAlerts(input),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** §25 Documental — documento vencido o próximo a vencer. */
function documentAlerts(input: AlertRuleInput): Alert[] {
  const alerts: Alert[] = [];
  for (const document of input.documents) {
    const status = documentStatusOf(document, input.warningDays, input.reference);
    const days = daysUntil(document.expiresAt, input.reference);
    if (status === 'Vencido') {
      alerts.push(
        build(input, 'Documental', 'critical', document.code, {
          message: `${document.name} vencido hace ${Math.abs(days ?? 0)} día(s).`,
          stationId: document.stationId,
          at: document.expiresAt ?? input.reference.toISOString(),
        }),
      );
    } else if (status === 'Próximo a vencer') {
      alerts.push(
        build(input, 'Documental', 'warning', document.code, {
          message: `${document.name} vence en ${days} día(s).`,
          stationId: document.stationId,
          at: document.expiresAt ?? input.reference.toISOString(),
        }),
      );
    } else if (status === 'Faltante') {
      alerts.push(
        build(input, 'Documental', 'critical', document.code, {
          message: `Requisito sin respaldo: ${document.name}.`,
          stationId: document.stationId,
          at: document.issuedAt,
        }),
      );
    }
  }
  return alerts;
}

/** §25 Operativa — operación sin cierre u observada. */
function operationAlerts(input: AlertRuleInput): Alert[] {
  const alerts: Alert[] = [];
  for (const operation of input.operations) {
    if (operation.status === 'Observada') {
      alerts.push(
        build(input, 'Operativa', 'critical', operation.code, {
          message: `Operación ${operation.code} marcada como observada.`,
          at: operation.updatedAt,
        }),
      );
      continue;
    }
    if (!OPEN_STATUSES.includes(operation.status)) {
      continue;
    }
    const stalled = daysUntil(operation.scheduledAt, input.reference);
    if (stalled !== null && Math.abs(stalled) >= input.stalledOperationDays) {
      alerts.push(
        build(input, 'Operativa', 'warning', operation.code, {
          message: `Operación ${operation.code} lleva ${Math.abs(stalled)} día(s) sin cierre.`,
          at: operation.scheduledAt,
        }),
      );
    }
  }
  return alerts;
}

/** §25 Volumétrica — diferencia fuera de parámetro respecto al umbral. */
function volumeAlerts(input: AlertRuleInput): Alert[] {
  const alerts: Alert[] = [];
  for (const tank of input.tanks) {
    const percent = volumeDifferencePercent(
      tank.physicalVolume - tank.theoreticalVolume,
      tank.theoreticalVolume,
    );
    const level = classifyVolumeDifference(percent, input.thresholdPercent);
    if (level === 'conforme') {
      continue;
    }
    alerts.push(
      build(input, 'Volumétrica', level === 'critico' ? 'critical' : 'warning', tank.code, {
        message: `Tanque ${tank.code}: diferencia de ${percent.toFixed(2)} % sobre el volumen calculado.`,
        stationId: tank.stationId,
        at: tank.lastMeasuredAt,
      }),
    );
  }
  return alerts;
}

/** §25 Declarativa — periodo pendiente de presentación. */
function declarationAlerts(input: AlertRuleInput): Alert[] {
  const currentPeriod = `${input.reference.getFullYear()}-${String(
    input.reference.getMonth() + 1,
  ).padStart(2, '0')}`;
  return input.declarations
    .filter(
      (declaration) =>
        declaration.status !== 'Presentada' && declaration.period.localeCompare(currentPeriod) < 0,
    )
    .map((declaration) =>
      build(input, 'Declarativa', 'warning', declaration.code, {
        message: `Declaración del periodo ${declaration.period} sigue en estado «${declaration.status}».`,
        at: `${declaration.period}-01T00:00:00`,
      }),
    );
}

/** §25 Incidencia — evento sin atención. */
function incidentAlerts(input: AlertRuleInput): Alert[] {
  return input.incidents
    .filter((incident) => incident.status !== 'Cerrada')
    .map((incident) =>
      build(
        input,
        'Incidencia',
        incident.severity === 'info' ? 'warning' : (incident.severity as AlertSeverity),
        incident.code,
        { message: incident.description, at: incident.openedAt, plantId: incident.plantId },
      ),
    );
}

interface AlertExtras {
  message: string;
  at: string;
  plantId?: string | null;
  stationId?: string | null;
}

function build(
  input: AlertRuleInput,
  type: AlertType,
  severity: AlertSeverity,
  entityRef: string,
  extras: AlertExtras,
): Alert {
  const stationId = extras.stationId ?? null;
  return {
    id: `alt-regla-${type.toLowerCase()}-${entityRef}`,
    type,
    severity,
    status: 'Abierta',
    message: extras.message,
    entityRef,
    plantId: extras.plantId ?? null,
    stationId,
    source: 'regla',
    createdAt: normalizeAt(extras.at, input.reference),
  };
}

/** `createdAt` nunca puede ser futuro respecto al corte: se acota. */
function normalizeAt(at: string, reference: Date): string {
  return at > reference.toISOString() ? reference.toISOString() : at;
}
