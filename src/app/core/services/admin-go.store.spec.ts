import { TestBed } from '@angular/core/testing';
import { AdminGoStore } from './admin-go.store';

describe('AdminGoStore', () => {
  let store: AdminGoStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(AdminGoStore);
  });

  it('expone la red de 16 plantas (§9)', () => {
    expect(store.plants().length).toBe(16);
  });

  it('expone las 24 entidades del modelo inicial (§28)', () => {
    expect(store.companies().length).toBeGreaterThan(0);
    expect(store.operations().length).toBeGreaterThan(0);
    expect(store.documents().length).toBeGreaterThan(0);
    expect(store.alerts().length).toBeGreaterThan(0);
    expect(store.declarations().length).toBeGreaterThan(0);
    expect(store.auditLogs().length).toBeGreaterThan(0);
    expect(store.tankMeasurements().length).toBeGreaterThan(0);
    expect(store.inventoryMovements().length).toBeGreaterThan(0);
  });

  it('calcula los indicadores de la Torre de Control (§8)', () => {
    const kpis = store.kpis();
    expect(kpis.plantsTotal).toBe(16);
    expect(kpis.plantsGreen + kpis.plantsYellow + kpis.plantsRed).toBe(16);
    expect(kpis.receivedVolume).toBeGreaterThan(0);
    expect(kpis.dispatchedVolume).toBeGreaterThan(0);
    expect(kpis.adminScore).toBeGreaterThan(0);
    expect(kpis.adminScore).toBeLessThanOrEqual(100);
  });

  it('ordena las plantas por criticidad (rojo primero)', () => {
    const ordered = store.plantsBySeverity();
    expect(ordered[0].status).toBe('red');
    expect(ordered[ordered.length - 1].status).toBe('green');
  });

  it('resuelve operaciones por su identificador único (§12)', () => {
    const operation = store.operationByCode('AG-DI-2026-000001');
    expect(operation?.code).toBe('AG-DI-2026-000001');
    expect(store.operationByCode('AG-DI-2026-999999')).toBeUndefined();
  });

  it('asocia evidencias y alertas a sus entidades (§13, §25)', () => {
    const operation = store.operations()[0];
    expect(store.evidencesOfOperation(operation.id).length).toBeGreaterThan(0);
    const plant = store.plants()[4];
    expect(store.alertsOfPlant(plant.id).length).toBeGreaterThan(0);
  });
});
