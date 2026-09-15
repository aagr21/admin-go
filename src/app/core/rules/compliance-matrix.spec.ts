import { AgDocument, Company, Requirement } from '@core/models/entities';
import { buildComplianceMatrix, coverageSummary } from './compliance-matrix';

const REFERENCE = new Date('2026-09-14T00:00:00');

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
    versions: [],
    observation: null,
    evidenceIds: [],
    ...overrides,
  };
}

describe('buildComplianceMatrix (§16)', () => {
  it('marca «Faltante» cuando la empresa no tiene ningún respaldo', () => {
    const [cell] = buildComplianceMatrix(
      [requirementFixture()],
      [companyFixture()],
      [],
      30,
      REFERENCE,
    );
    expect(cell.status).toBe('Faltante');
    expect(cell.documents).toEqual([]);
  });

  it('marca «No aplica» cuando el tipo de cliente queda fuera del requisito', () => {
    const [cell] = buildComplianceMatrix(
      [requirementFixture({ clientKinds: ['Transportista'] })],
      [companyFixture({ kind: 'Importador' })],
      [],
      30,
      REFERENCE,
    );
    expect(cell.status).toBe('No aplica');
  });

  it('toma el peor estado cuando hay varios documentos', () => {
    const [cell] = buildComplianceMatrix(
      [requirementFixture()],
      [companyFixture()],
      [
        documentFixture({ id: 'a', expiresAt: '2027-12-31' }),
        documentFixture({ id: 'b', expiresAt: '2026-09-20' }),
      ],
      30,
      REFERENCE,
    );
    expect(cell.status).toBe('Próximo a vencer');
    expect(cell.documents).toHaveLength(2);
  });

  it('el vencido pesa más que el próximo a vencer', () => {
    const [cell] = buildComplianceMatrix(
      [requirementFixture()],
      [companyFixture()],
      [
        documentFixture({ id: 'a', expiresAt: '2026-09-20' }),
        documentFixture({ id: 'b', expiresAt: '2026-08-01' }),
      ],
      30,
      REFERENCE,
    );
    expect(cell.status).toBe('Vencido');
  });

  it('no mezcla documentos de otra empresa', () => {
    const [cell] = buildComplianceMatrix(
      [requirementFixture()],
      [companyFixture()],
      [documentFixture({ companyId: 'cmp-9' })],
      30,
      REFERENCE,
    );
    expect(cell.status).toBe('Faltante');
  });

  it('respeta el tipo de cliente cuando el requisito sí aplica', () => {
    const [cell] = buildComplianceMatrix(
      [requirementFixture({ clientKinds: ['Importador', 'Operador'] })],
      [companyFixture({ kind: 'Operador' })],
      [documentFixture()],
      30,
      REFERENCE,
    );
    expect(cell.status).toBe('Vigente');
  });

  it('expone el responsable y el vencimiento del expediente determinante', () => {
    const [cell] = buildComplianceMatrix(
      [requirementFixture()],
      [companyFixture()],
      [documentFixture({ responsible: 'Marcela Rojas', expiresAt: '2027-01-31' })],
      30,
      REFERENCE,
    );
    expect(cell.responsible).toBe('Marcela Rojas');
    expect(cell.expiresAt).toBe('2027-01-31');
  });
});

describe('coverageSummary', () => {
  it('cuenta las celdas por estado', () => {
    const cells = buildComplianceMatrix(
      [requirementFixture()],
      [companyFixture(), companyFixture({ id: 'cmp-2', kind: 'Transportista' })],
      [],
      30,
      REFERENCE,
    );
    const summary = coverageSummary(cells);
    expect(summary.Faltante).toBe(2);
    expect(summary['No aplica']).toBe(0);
  });
});
