import { AgDocument, Company, Declaration, Operation, Requirement } from '@core/models/entities';
import { complianceLevelOf, validateDeclaration } from './validation';

const REFERENCE = new Date('2026-09-14T00:00:00');
const WARNING_DAYS = 30;
const THRESHOLD = 1.5;

function companyFixture(overrides: Partial<Company> = {}): Company {
  return {
    id: 'cmp-1',
    name: 'Importadora Andina',
    nit: '1023456',
    kind: 'Importador',
    contactName: 'Marcela Rojas',
    contactEmail: 'contacto@andina.bo',
    active: true,
    ...overrides,
  };
}

function declarationFixture(overrides: Partial<Declaration> = {}): Declaration {
  return {
    id: 'dcl-1',
    code: 'DEC-AND-2026-09',
    companyId: 'cmp-1',
    period: '2026-09',
    operationIds: ['op-1'],
    documentIds: ['doc-1'],
    totalVolume: 100_000,
    closingInventory: 50_000,
    adjustments: 0,
    validation: 'ok',
    status: 'Borrador',
    responsible: 'Iván Terceros',
    presentedAt: null,
    version: 1,
    ...overrides,
  };
}

function operationFixture(overrides: Partial<Operation> = {}): Operation {
  return {
    id: 'op-1',
    code: 'AG-DI-2026-000001',
    type: 'Recepción',
    status: 'Cerrada',
    product: 'Diésel Importado',
    origin: 'Planta Cochabamba',
    destination: 'EESS Central',
    companyId: 'cmp-1',
    scheduledVolume: 34_800,
    documentedVolume: 34_800,
    receivedVolume: 34_800,
    cisternPlate: 'CIS-1123-ABC',
    driverId: 'drv-1',
    driverName: 'Juan Quispe',
    sealCodes: ['PRC-4000'],
    plantId: null,
    stationId: null,
    tankId: null,
    documentIds: [],
    evidenceIds: [],
    incidentIds: [],
    scheduledAt: '2026-09-10T08:00:00',
    updatedAt: '2026-09-10T18:00:00',
    ...overrides,
  };
}

function documentFixture(overrides: Partial<AgDocument> = {}): AgDocument {
  return {
    id: 'doc-1',
    code: 'REQ-DOC-01',
    name: 'Permiso operativo',
    category: 'Regulatorio',
    companyId: 'cmp-1',
    stationId: null,
    operationId: null,
    issuedAt: '2026-01-01',
    expiresAt: '2027-12-31',
    status: 'Vigente',
    responsible: 'Iván Terceros',
    versions: [
      {
        version: 1,
        uploadedAt: '2026-01-01T09:00:00',
        uploadedBy: 'Iván Terceros',
        fileName: 'permiso.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 120_000,
        note: null,
      },
    ],
    observation: null,
    evidenceIds: [],
    ...overrides,
  };
}

function requirementFixture(overrides: Partial<Requirement> = {}): Requirement {
  return {
    id: 'req-1',
    code: 'REQ-DOC-01',
    name: 'Permiso operativo',
    appliesTo: 'cliente',
    mandatory: true,
    validityDays: 365,
    clientKinds: [],
    active: true,
    ...overrides,
  };
}

function run(overrides: Partial<Parameters<typeof validateDeclaration>[0]> = {}) {
  return validateDeclaration({
    declaration: declarationFixture(),
    company: companyFixture(),
    operations: [operationFixture()],
    documents: [documentFixture()],
    requirements: [requirementFixture()],
    allOperations: [operationFixture()],
    warningDays: WARNING_DAYS,
    thresholdPercent: THRESHOLD,
    reference: REFERENCE,
    ...overrides,
  });
}

describe('validateDeclaration — CHECK ADMIN GO (§18)', () => {
  it('no encuentra hallazgos en un periodo completo y respaldado', () => {
    expect(run()).toEqual([]);
    expect(complianceLevelOf(run())).toBe('ok');
  });

  it('marca crítico el requisito obligatorio sin respaldo documental', () => {
    const findings = run({ documents: [] });
    const finding = findings.find((item) => item.code === 'documentos-faltantes');
    expect(finding?.level).toBe('critical');
    expect(complianceLevelOf(findings)).toBe('critical');
  });

  it('degrada a observado cuando el requisito sin respaldo no es obligatorio', () => {
    const findings = run({
      documents: [],
      requirements: [requirementFixture({ mandatory: false })],
    });
    const finding = findings.find((item) => item.code === 'documentos-faltantes');
    expect(finding?.level).toBe('observed');
    expect(complianceLevelOf(findings)).toBe('observed');
  });

  it('ignora requisitos que no aplican al tipo de cliente', () => {
    const findings = run({
      documents: [],
      company: companyFixture({ kind: 'Transportista' }),
      requirements: [requirementFixture({ clientKinds: ['Importador'] })],
    });
    expect(findings).toEqual([]);
  });

  it('detecta operaciones abiertas y observadas con distinta severidad', () => {
    const open = run({ operations: [operationFixture({ status: 'En tránsito' })] });
    expect(open.find((item) => item.code === 'operaciones-abiertas')?.level).toBe('observed');

    const observed = run({ operations: [operationFixture({ status: 'Observada' })] });
    expect(observed.find((item) => item.code === 'operaciones-abiertas')?.level).toBe('critical');
  });

  it('marca crítico un desvío volumétrico sobre el umbral configurable', () => {
    const findings = run({
      operations: [operationFixture({ documentedVolume: 10_000, receivedVolume: 10_300 })],
    });
    const finding = findings.find((item) => item.code === 'diferencias-volumetricas');
    expect(finding?.level).toBe('critical');
    expect(finding?.detail).toContain('3.00 %');
  });

  it('no señala diferencias dentro del umbral', () => {
    const findings = run({
      operations: [operationFixture({ documentedVolume: 10_000, receivedVolume: 10_050 })],
    });
    expect(findings.some((item) => item.code === 'diferencias-volumetricas')).toBe(false);
  });

  it('detecta duplicados de operación dentro de la declaración', () => {
    const findings = run({
      declaration: declarationFixture({ operationIds: ['op-1', 'op-1'] }),
    });
    expect(findings.find((item) => item.code === 'duplicados')?.level).toBe('critical');
  });

  it('detecta códigos de operación repetidos en el universo', () => {
    const findings = run({
      allOperations: [operationFixture(), operationFixture({ id: 'op-2' })],
    });
    expect(findings.find((item) => item.code === 'duplicados')?.entityRefs).toContain(
      'AG-DI-2026-000001',
    );
  });

  it('detecta documentos ligados a operaciones fuera del periodo', () => {
    const findings = run({
      documents: [documentFixture({ operationId: 'op-999' })],
    });
    expect(findings.find((item) => item.code === 'inconsistencia-documento-operacion')?.level).toBe(
      'observed',
    );
  });

  it('detecta expedientes sin ningún archivo cargado', () => {
    const findings = run({ documents: [documentFixture({ versions: [] })] });
    expect(findings.some((item) => item.title === 'Documentos sin versión cargada')).toBe(true);
  });

  it('marca crítico un periodo con formato inválido', () => {
    const findings = run({ declaration: declarationFixture({ period: 'septiembre' }) });
    expect(findings.find((item) => item.code === 'periodo-incompleto')?.level).toBe('critical');
  });

  it('marca crítico cuando faltan campos obligatorios', () => {
    const findings = run({
      declaration: declarationFixture({ responsible: '' }),
      operations: [],
    });
    const finding = findings.find((item) => item.code === 'campos-obligatorios');
    expect(finding?.level).toBe('critical');
    expect(finding?.detail).toContain('responsable');
  });
});

describe('complianceLevelOf', () => {
  it('un solo crítico domina sobre cualquier observado', () => {
    expect(
      complianceLevelOf([
        { code: 'duplicados', level: 'observed', title: '', detail: '', entityRefs: [] },
        { code: 'periodo-incompleto', level: 'critical', title: '', detail: '', entityRefs: [] },
      ]),
    ).toBe('critical');
  });

  it('sin hallazgos el resultado es OK', () => {
    expect(complianceLevelOf([])).toBe('ok');
  });
});
