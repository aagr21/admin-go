import { TestBed } from '@angular/core/testing';
import { provideAdminGoApi } from '@core/api/api.provider';
import { AdminGoStore } from './admin-go.store';

describe('AdminGoStore', () => {
  let store: AdminGoStore;

  beforeEach(async () => {
    // Sesión de Superadministrador: ámbito nacional, sin acotar por empresa.
    sessionStorage.setItem('admingo.session', 'usr-1');
    TestBed.configureTestingModule({ providers: [provideAdminGoApi()] });
    store = TestBed.inject(AdminGoStore);
    await store.load();
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

describe('AdminGoStore · fuente única del estado documental (§15)', () => {
  let store: AdminGoStore;

  beforeEach(async () => {
    sessionStorage.setItem('admingo.session', 'usr-1');
    TestBed.configureTestingModule({ providers: [provideAdminGoApi()] });
    store = TestBed.inject(AdminGoStore);
    await store.load();
  });

  it('el KPI del Dashboard sigue al umbral configurable, no a un valor fijo', () => {
    // Regresión: el KPI leía el estado almacenado y el reporte lo recalculaba,
    // así que podían contradecirse al cambiar los días de aviso.
    expect(store.kpis().documentsExpiringSoon).toBe(2);

    store.documentWarningDays.set(120);
    const derived = store
      .classifiedDocuments()
      .filter((item) => item.status === 'Próximo a vencer').length;

    expect(derived).toBe(5);
    expect(store.kpis().documentsExpiringSoon).toBe(derived);
  });

  it('el módulo documental y el KPI comparten el mismo estado', () => {
    store.documentWarningDays.set(7);
    const expiring = store.classifiedDocuments().filter((d) => d.status === 'Próximo a vencer');
    expect(store.kpis().documentsExpiringSoon).toBe(expiring.length);
  });
});

describe('AdminGoStore · aislamiento por empresa (§29)', () => {
  it('un administrador de cliente solo ve datos de su empresa', async () => {
    sessionStorage.setItem('admingo.session', 'usr-2'); // Administrador cliente · cmp-1
    TestBed.configureTestingModule({ providers: [provideAdminGoApi()] });
    const store = TestBed.inject(AdminGoStore);
    await store.load();

    expect(store.companies().map((company) => company.id)).toEqual(['cmp-1']);
    expect(store.scope().global).toBe(false);
    expect(store.operations().length).toBeGreaterThan(0);
    expect(store.operations().every((operation) => operation.companyId === 'cmp-1')).toBe(true);
    expect(store.documents().every((document) => document.companyId === 'cmp-1')).toBe(true);
    // Las estaciones de otras empresas quedan fuera.
    expect(store.stations().every((station) => station.companyId === 'cmp-1')).toBe(true);
  });

  it('el personal de AdminGo conserva la visión nacional de las 16 plantas', async () => {
    sessionStorage.setItem('admingo.session', 'usr-1'); // Superadministrador · cmp-0
    TestBed.configureTestingModule({ providers: [provideAdminGoApi()] });
    const store = TestBed.inject(AdminGoStore);
    await store.load();

    expect(store.scope().global).toBe(true);
    expect(store.plants()).toHaveLength(16);
  });
});

describe('AdminGoStore · ciclo de control operativo (§10, §11)', () => {
  let store: AdminGoStore;

  beforeEach(async () => {
    sessionStorage.setItem('admingo.session', 'usr-1');
    TestBed.configureTestingModule({ providers: [provideAdminGoApi()] });
    store = TestBed.inject(AdminGoStore);
    await store.load();
  });

  it('programa, abre y cierra un control generando informe e incidencia', async () => {
    const auditBefore = store.auditLogs().length;

    const control = await store.createControl({
      plantId: store.plants()[0].id,
      scheduledAt: '2026-09-20T06:30:00',
      shift: 'Mañana',
      supervisor: 'Ramiro Loza',
      product: 'Diésel Importado',
      initialVolume: 100_000,
    });
    expect(control.status).toBe('Programado');
    expect(store.controlById(control.id)).toBeTruthy();

    const opened = await store.openControl(control.id);
    expect(opened.status).toBe('En ejecución');
    expect(opened.arrivedAt).not.toBeNull();

    const closed = await store.closeControl(control.id, {
      receivedVolume: 20_000,
      dispatchedVolume: 5_000,
      cisternsIn: 1,
      cisternsOut: 1,
      sealsVerified: 4,
      documentsVerified: 6,
      observation: 'Diferencia detectada en tanque 2.',
      openIncident: true,
      incidentDescription: 'Diferencia de 120 L en tanque 2.',
      closedBy: 'Ramiro Loza',
    });

    expect(closed.status).toBe('Escalado');
    // Saldo = inicial + recepciones − despachos (§14).
    expect(closed.balance).toBe(115_000);
    expect(closed.closedAt).not.toBeNull();
    expect(closed.reportDocumentId).not.toBeNull();
    expect(closed.incidentIds).toHaveLength(1);
    // El informe queda disponible como documento del expediente.
    expect(store.documentById(closed.reportDocumentId as string)).toBeTruthy();
    // Y todo el ciclo deja rastro en auditoría (§27).
    expect(store.auditLogs().length).toBeGreaterThan(auditBefore);
  });

  it('rechaza abrir un control que ya no está programado', async () => {
    const control = store.operationalControls().find((item) => item.status === 'Cerrado');
    expect(control).toBeTruthy();
    await expect(store.openControl((control as { id: string }).id)).rejects.toThrow();
  });
});

describe('AdminGoStore · alertas derivadas por reglas (§25)', () => {
  it('genera alertas documentales a partir del umbral, no de datos fijos', async () => {
    sessionStorage.setItem('admingo.session', 'usr-1');
    TestBed.configureTestingModule({ providers: [provideAdminGoApi()] });
    const store = TestBed.inject(AdminGoStore);
    await store.load();

    const ruleAlerts = store.alerts().filter((alert) => alert.source === 'regla');
    expect(ruleAlerts.length).toBeGreaterThan(0);
    expect(ruleAlerts.some((alert) => alert.type === 'Documental')).toBe(true);
    expect(ruleAlerts.some((alert) => alert.type === 'Incidencia')).toBe(true);
    // Los identificadores derivados son estables: es lo que permite conservar
    // el estado de las atendidas al recalcular (ver la prueba siguiente).
    expect(ruleAlerts.every((alert) => alert.id.startsWith('alt-regla-'))).toBe(true);
    // Las alertas curadas del dataset se conservan como registros manuales.
    expect(store.alerts().some((alert) => alert.source === 'manual')).toBe(true);
  });

  it('conserva el estado de una alerta atendida al recalcular las reglas', async () => {
    sessionStorage.setItem('admingo.session', 'usr-1');
    TestBed.configureTestingModule({ providers: [provideAdminGoApi()] });
    const store = TestBed.inject(AdminGoStore);
    await store.load();

    const alert = store.alerts().find((item) => item.source === 'regla');
    expect(alert).toBeTruthy();
    await store.setAlertStatus((alert as { id: string }).id, 'Atendida');

    const after = store.alerts().find((item) => item.id === (alert as { id: string }).id);
    expect(after?.status).toBe('Atendida');
  });
});

describe('AdminGoStore · escritura y auditoría (§12, §15, §27)', () => {
  let store: AdminGoStore;

  beforeEach(async () => {
    sessionStorage.setItem('admingo.session', 'usr-1');
    TestBed.configureTestingModule({ providers: [provideAdminGoApi()] });
    store = TestBed.inject(AdminGoStore);
    await store.load();
  });

  it('crea una operación con identificador único y la registra en auditoría', async () => {
    const before = store.operations().length;
    const operation = await store.createOperation({
      type: 'Despacho',
      status: 'Programada',
      product: 'Diésel Importado',
      origin: 'Planta Cochabamba',
      destination: 'EESS Central 24h',
      companyId: 'cmp-1',
      scheduledVolume: 30_000,
      documentedVolume: 30_000,
      receivedVolume: 0,
      cisternPlate: 'CIS-1123-ABC',
      driverId: 'drv-1',
      plantId: null,
      stationId: null,
      tankId: null,
      scheduledAt: '2026-09-21T08:00:00',
    });

    expect(operation.code).toMatch(/^AG-DP-2026-\d{6}$/);
    expect(store.operations()).toHaveLength(before + 1);
    expect(store.operationByCode(operation.code)).toBeTruthy();
    const entry = store.auditLogs().find((log) => log.entityRef === operation.type);
    expect(entry?.action).toBe('Crear operación');
  });

  it('audita campo a campo al modificar una operación', async () => {
    const target = store.operations()[0];
    await store.updateOperation(target.id, {
      type: target.type,
      status: 'Observada',
      product: target.product,
      origin: target.origin,
      destination: target.destination,
      companyId: target.companyId,
      scheduledVolume: target.scheduledVolume,
      documentedVolume: target.documentedVolume,
      receivedVolume: target.receivedVolume + 250,
      cisternPlate: target.cisternPlate,
      driverId: target.driverId,
      plantId: target.plantId,
      stationId: target.stationId,
      tankId: target.tankId,
      scheduledAt: target.scheduledAt,
    });

    const changes = store
      .auditLogs()
      .filter((log) => log.entityRef === target.code && log.action === 'Modificar operación');
    expect(changes.map((log) => log.field)).toContain('status');
    expect(changes.map((log) => log.field)).toContain('receivedVolume');
  });

  it('registra un documento y le añade versiones conservando el historial', async () => {
    const document = await store.createDocument({
      name: 'Póliza nueva',
      category: 'Vehículo',
      code: 'REQ-VEH-01',
      companyId: 'cmp-1',
      stationId: null,
      operationId: null,
      issuedAt: '2026-09-14',
      expiresAt: '2027-09-14',
      responsible: 'Marcela Rojas',
      observation: null,
      fileName: 'poliza.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 210_000,
      uploadedBy: 'Marcela Rojas',
    });
    expect(document.versions).toHaveLength(1);

    const updated = await store.addDocumentVersion(document.id, {
      fileName: 'poliza-v2.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 215_000,
      note: 'Se corrige la vigencia.',
      uploadedBy: 'Marcela Rojas',
    });
    expect(updated.versions).toHaveLength(2);
    expect(updated.versions[1].note).toBe('Se corrige la vigencia.');
  });

  it('rechaza usuarios duplicados sin romper el estado', async () => {
    await expect(
      store.createUser({
        username: 'admin',
        fullName: 'Repetido',
        email: 'repetido@admingo.bo',
        role: 'Auditor',
        companyId: 'cmp-0',
        active: true,
      }),
    ).rejects.toThrow();
    expect(store.error()).toContain('ya existe');
  });

  it('cambia el rol de un usuario y lo deja auditado', async () => {
    const user = store.users().find((item) => item.username === 'auditor.01');
    expect(user).toBeTruthy();
    await store.updateUser((user as { id: string }).id, { role: 'Gerente' });

    const updated = store.userById((user as { id: string }).id);
    expect(updated?.role).toBe('Gerente');
    expect(
      store.auditLogs().some((log) => log.entityType === 'Usuario' && log.field === 'role'),
    ).toBe(true);
  });

  it('registra un requisito nuevo en la matriz (§16)', async () => {
    const before = store.requirements().length;
    await store.createRequirement({
      code: 'REQ-NEW-01',
      name: 'Nuevo requisito',
      appliesTo: 'cliente',
      mandatory: true,
      validityDays: 180,
      clientKinds: [],
      active: true,
    });
    expect(store.requirements()).toHaveLength(before + 1);
  });
});

describe('AdminGoStore · permisos por acción (§6)', () => {
  it('el Auditor puede consultar y exportar, pero no modificar', async () => {
    sessionStorage.setItem('admingo.session', 'usr-8'); // auditor.01
    TestBed.configureTestingModule({ providers: [provideAdminGoApi()] });
    const store = TestBed.inject(AdminGoStore);
    await store.load();

    expect(store.can('read')).toBe(true);
    expect(store.can('export')).toBe(true);
    expect(store.can('update')).toBe(false);
    expect(store.can('create')).toBe(false);
    expect(store.can('configure')).toBe(false);
  });

  it('el Superadministrador puede configurar, cerrar y validar', async () => {
    sessionStorage.setItem('admingo.session', 'usr-1');
    TestBed.configureTestingModule({ providers: [provideAdminGoApi()] });
    const store = TestBed.inject(AdminGoStore);
    await store.load();

    expect(store.can('configure')).toBe(true);
    expect(store.can('close')).toBe(true);
    expect(store.can('validate')).toBe(true);
  });
});
