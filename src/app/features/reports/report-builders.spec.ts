import { AgDocument, Plant, Tank } from '@core/models/entities';
import { formatLiters } from '@shared/util/format';
import {
  dailyPlantReport,
  differenceLabel,
  documentsReport,
  volumeDifferencesReport,
} from './report-builders';

function plantFixture(overrides: Partial<Plant>): Plant {
  return {
    id: 'p1',
    code: 'P-001',
    name: 'Planta Central',
    city: 'Cochabamba',
    department: 'Cochabamba',
    status: 'green',
    adminScore: 90,
    products: ['GB'],
    availableVolume: 0,
    receivedToday: 0,
    dispatchedToday: 0,
    theoreticalBalance: 0,
    physicalBalance: 0,
    openOperations: 0,
    cisternsInside: 0,
    lastControlAt: '2026-09-14T08:00:00',
    ...overrides,
  };
}

function tankFixture(overrides: Partial<Tank>): Tank {
  return {
    id: 't1',
    code: 'TQ-001',
    stationId: 's1',
    product: 'Gasolina especial',
    capacity: 30_000,
    physicalVolume: 10_000,
    theoreticalVolume: 10_000,
    status: 'green',
    lastMeasuredAt: '2026-09-14T07:30:00',
    ...overrides,
  };
}

function documentFixture(
  expiresAt: string | null,
  overrides: Partial<AgDocument> = {},
): AgDocument {
  return {
    id: 'd1',
    code: 'DOC-001',
    name: 'Permiso operativo',
    category: 'instalación',
    companyId: 'c1',
    operationId: null,
    issuedAt: '2026-01-10',
    expiresAt,
    status: 'Vigente',
    responsible: 'Cliente',
    version: 1,
    observation: null,
    ...overrides,
  };
}

describe('report-builders', () => {
  it('clasifica la diferencia % según el umbral configurable (§14)', () => {
    expect(differenceLabel(2, 1.5)).toBe('Crítico');
    expect(differenceLabel(1, 1.5)).toBe('Observado');
    expect(differenceLabel(0.5, 1.5)).toBe('Conforme');
  });

  it('el reporte diario suma totales en el pie', () => {
    const report = dailyPlantReport([
      plantFixture({ id: 'p1', receivedToday: 1000 }),
      plantFixture({ id: 'p2', receivedToday: 500 }),
    ]);
    expect(report.rows).toHaveLength(2);
    expect(report.foot?.[0][2]).toBe(formatLiters(1500));
  });

  it('el reporte de diferencias marca crítico sobre el umbral', () => {
    const report = volumeDifferencesReport(
      [
        tankFixture({ id: 't1', physicalVolume: 10_300, theoreticalVolume: 10_000 }),
        tankFixture({ id: 't2', physicalVolume: 10_150, theoreticalVolume: 10_000 }),
      ],
      1.5,
    );
    expect(report.rows[0][6]).toBe('Crítico');
    expect(report.rows[1][6]).toBe('Observado');
  });

  it('el reporte de vencimientos respeta los días de aviso configurados', () => {
    const report = documentsReport(
      [documentFixture('2026-10-14', { id: 'd1' }), documentFixture('2026-09-19', { id: 'd2' })],
      10,
    );
    expect(report.rows[0][7]).toBe('Vigente');
    expect(report.rows[1][7]).toBe('Próximo a vencer');
  });
});
