import { computed, Injectable, signal } from '@angular/core';
import {
  AgDocument,
  Alert,
  AuditLog,
  Cistern,
  Company,
  ControlTowerKpis,
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
  Volume,
} from '@core/models/entities';
import {
  CISTERNS,
  COMPANIES,
  DOCUMENTS,
  DRIVERS,
  OPERATIONS,
  OPERATIONS_BY_CODE,
  PLANTS,
  PLANTS_BY_ID,
  PRODUCTS,
  REQUIREMENTS,
  STATIONS,
  TANKS,
} from '../data/mock-data';
import { ALERTS, EVIDENCES, INCIDENTS, QUALITY_CONTROLS } from '../data/mock-activity';
import {
  AUDIT_LOGS,
  DECLARATIONS,
  INVENTORY_MOVEMENTS,
  OPERATIONAL_CONTROLS,
  TANK_MEASUREMENTS,
  VOLUMES,
} from '../data/mock-compliance';

/**
 * Estado central de la Torre de Control (§8).
 * Por ahora alimentado por el dataset de demostración; en producción se
 * conectará al backend vía API (§30, §31).
 */
@Injectable({ providedIn: 'root' })
export class AdminGoStore {
  readonly companies = signal<Company[]>(COMPANIES);
  readonly products = signal<Product[]>(PRODUCTS);
  readonly plants = signal<Plant[]>(PLANTS);
  readonly stations = signal<Station[]>(STATIONS);
  readonly tanks = signal<Tank[]>(TANKS);
  readonly cisterns = signal<Cistern[]>(CISTERNS);
  readonly drivers = signal<Driver[]>(DRIVERS);
  readonly requirements = signal<Requirement[]>(REQUIREMENTS);
  readonly operations = signal<Operation[]>(OPERATIONS);
  readonly documents = signal<AgDocument[]>(DOCUMENTS);
  readonly evidences = signal<Evidence[]>(EVIDENCES);
  readonly alerts = signal<Alert[]>(ALERTS);
  readonly incidents = signal<Incident[]>(INCIDENTS);
  readonly qualityControls = signal<QualityControl[]>(QUALITY_CONTROLS);
  readonly declarations = signal<Declaration[]>(DECLARATIONS);
  readonly operationalControls = signal<OperationalControl[]>(OPERATIONAL_CONTROLS);
  readonly auditLogs = signal<AuditLog[]>(AUDIT_LOGS);
  readonly volumes = signal<Volume[]>(VOLUMES);
  readonly inventoryMovements = signal<InventoryMovement[]>(INVENTORY_MOVEMENTS);
  readonly tankMeasurements = signal<TankMeasurement[]>(TANK_MEASUREMENTS);

  /** Parámetros configurables de la plataforma (§14): nunca rígidamente codificados. */
  readonly maxVolumeDifferencePercent = signal<number>(1.5);
  readonly documentWarningDays = signal<number>(30);

  /** Configuración consolidada para módulos que la consumen (reportes §26). */
  readonly settings = computed(() => ({
    maxVolumeDifferencePercent: this.maxVolumeDifferencePercent(),
    documentWarningDays: this.documentWarningDays(),
  }));

  /** Indicadores consolidados del Dashboard / Control Tower (§8). */
  readonly kpis = computed<ControlTowerKpis>(() => {
    const plants = this.plants();
    const receivedVolume = sum(plants, (p) => p.receivedToday);
    const dispatchedVolume = sum(plants, (p) => p.dispatchedToday);
    const theoreticalInventory = sum(plants, (p) => p.theoreticalBalance);
    const physicalInventory = sum(plants, (p) => p.physicalBalance);
    const volumeDifference = physicalInventory - theoreticalInventory;
    const operations = this.operations();
    const documents = this.documents();
    const alerts = this.alerts();
    const declarations = this.declarations();
    const adminScore = plants.length
      ? Math.round(sum(plants, (p) => p.adminScore) / plants.length)
      : 0;

    return {
      plantsTotal: plants.length,
      plantsGreen: plants.filter((p) => p.status === 'green').length,
      plantsYellow: plants.filter((p) => p.status === 'yellow').length,
      plantsRed: plants.filter((p) => p.status === 'red').length,
      receivedVolume,
      dispatchedVolume,
      theoreticalInventory,
      physicalInventory,
      volumeDifference,
      volumeDifferencePercent: theoreticalInventory
        ? (volumeDifference / theoreticalInventory) * 100
        : 0,
      openOperations: operations.filter(
        (o) => o.status === 'Programada' || o.status === 'En tránsito' || o.status === 'Recibida',
      ).length,
      observedOperations: operations.filter((o) => o.status === 'Observada').length,
      documentsExpiringSoon: documents.filter((d) => d.status === 'Próximo a vencer').length,
      documentsExpired: documents.filter((d) => d.status === 'Vencido').length,
      pendingDeclarations: declarations.filter((d) => d.status !== 'Presentada').length,
      criticalAlerts: alerts.filter((a) => a.severity === 'critical' && a.status !== 'Atendida')
        .length,
      openIncidents: this.incidents().filter((i) => i.status !== 'Cerrada').length,
      adminScore,
    };
  });

  /** Plantas ordenadas de mayor a menor criticidad para el semáforo (§8). */
  readonly plantsBySeverity = computed(() =>
    [...this.plants()].sort(
      (a, b) => statusWeight(a.status) - statusWeight(b.status) || a.adminScore - b.adminScore,
    ),
  );

  readonly criticalAlerts = computed(() =>
    this.alerts().filter((a) => a.severity === 'critical' && a.status !== 'Atendida'),
  );

  /** Registra en auditoría la generación de un reporte (§26, §27). */
  logReportGenerated(username: string, slug: string, format: 'pdf' | 'xlsx'): void {
    const entry: AuditLog = {
      id: `log-report-${Date.now()}`,
      username,
      at: new Date().toISOString(),
      entityType: 'Reporte',
      entityRef: slug,
      field: 'formato',
      previousValue: '',
      newValue: format,
      action: 'Generar reporte',
    };
    this.auditLogs.update((logs) => [entry, ...logs]);
  }

  plantById(id: string | null): Plant | undefined {
    return id ? PLANTS_BY_ID.get(id) : undefined;
  }

  stationById(id: string | null): Station | undefined {
    return id ? this.stations().find((s) => s.id === id) : undefined;
  }

  tankById(id: string | null): Tank | undefined {
    return id ? this.tanks().find((t) => t.id === id) : undefined;
  }

  companyById(id: string | null): Company | undefined {
    return id ? this.companies().find((c) => c.id === id) : undefined;
  }

  operationById(id: string | null): Operation | undefined {
    return id ? this.operations().find((o) => o.id === id) : undefined;
  }

  operationByCode(code: string): Operation | undefined {
    return OPERATIONS_BY_CODE.get(code);
  }

  driverById(id: string): Driver | undefined {
    return this.drivers().find((d) => d.id === id);
  }

  documentsOfOperation(operationId: string): AgDocument[] {
    return this.documents().filter((d) => d.operationId === operationId);
  }

  evidencesOfOperation(operationId: string): Evidence[] {
    return this.evidences().filter((e) => e.operationId === operationId);
  }

  alertsOfPlant(plantId: string): Alert[] {
    return this.alerts().filter((a) => a.plantId === plantId);
  }

  operationsOfPlant(plantId: string): Operation[] {
    return this.operations().filter((o) => o.plantId === plantId);
  }
}

function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0);
}

function statusWeight(status: Plant['status']): number {
  return status === 'red' ? 0 : status === 'yellow' ? 1 : 2;
}
