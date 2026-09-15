import { AgDocument } from '@core/models/entities';
import { classifyDocuments, currentVersionOf, documentStatusOf } from './document-status';

const REFERENCE = new Date('2026-09-14T00:00:00');

function documentFixture(overrides: Partial<AgDocument> = {}): AgDocument {
  return {
    id: 'doc-1',
    code: 'REQ-DOC-01',
    name: 'Permiso',
    category: 'Regulatorio',
    companyId: 'cmp-1',
    stationId: null,
    operationId: null,
    issuedAt: '2026-01-01',
    expiresAt: '2026-12-31',
    status: 'Vigente',
    responsible: 'Responsable',
    versions: [],
    observation: null,
    evidenceIds: [],
    ...overrides,
  };
}

describe('documentStatusOf', () => {
  it('deriva «Vigente» cuando falta más que la ventana de aviso', () => {
    expect(documentStatusOf(documentFixture(), 30, REFERENCE)).toBe('Vigente');
  });

  it('deriva «Próximo a vencer» dentro de la ventana configurada', () => {
    const document = documentFixture({ expiresAt: '2026-10-05' });
    expect(documentStatusOf(document, 30, REFERENCE)).toBe('Próximo a vencer');
    // El mismo documento deja de estar en aviso si se estrecha la ventana.
    expect(documentStatusOf(document, 10, REFERENCE)).toBe('Vigente');
  });

  it('deriva «Vencido» cuando la fecha ya pasó', () => {
    expect(documentStatusOf(documentFixture({ expiresAt: '2026-08-01' }), 30, REFERENCE)).toBe(
      'Vencido',
    );
  });

  it('respeta las calificaciones humanas del §15', () => {
    expect(documentStatusOf(documentFixture({ status: 'Faltante' }), 30, REFERENCE)).toBe(
      'Faltante',
    );
    expect(documentStatusOf(documentFixture({ status: 'Observado' }), 30, REFERENCE)).toBe(
      'Observado',
    );
  });

  it('no fuerza estado cuando el documento no vence', () => {
    expect(documentStatusOf(documentFixture({ expiresAt: null }), 30, REFERENCE)).toBe('Vigente');
  });

  it('la ventana de aviso es la única fuente del estado temporal', () => {
    const document = documentFixture({ expiresAt: '2026-11-14' });
    expect(documentStatusOf(document, 30, REFERENCE)).toBe('Vigente');
    expect(documentStatusOf(document, 90, REFERENCE)).toBe('Próximo a vencer');
  });
});

describe('currentVersionOf', () => {
  it('devuelve la última versión cargada', () => {
    const document = documentFixture({
      versions: [
        {
          version: 1,
          uploadedAt: '2026-01-01T09:00:00',
          uploadedBy: 'a',
          fileName: 'a.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 120_000,
          note: null,
        },
        {
          version: 2,
          uploadedAt: '2026-02-01T09:00:00',
          uploadedBy: 'b',
          fileName: 'b.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 120_000,
          note: null,
        },
      ],
    });
    expect(currentVersionOf(document)).toBe(2);
  });

  it('devuelve 0 si el expediente no tiene ningún archivo', () => {
    expect(currentVersionOf(documentFixture())).toBe(0);
  });
});

describe('classifyDocuments', () => {
  it('clasifica el lote con la misma regla y expone los días restantes', () => {
    const [ok, warning, expired] = classifyDocuments(
      [
        documentFixture({ id: 'a', expiresAt: '2026-12-31' }),
        documentFixture({ id: 'b', expiresAt: '2026-09-19' }),
        documentFixture({ id: 'c', expiresAt: '2026-09-10' }),
      ],
      30,
      REFERENCE,
    );
    expect([ok.status, warning.status, expired.status]).toEqual([
      'Vigente',
      'Próximo a vencer',
      'Vencido',
    ]);
    expect(warning.days).toBe(5);
    expect(expired.days).toBe(-4);
  });
});
