import { daysUntil, formatDate, formatDateNumeric, formatLiters, formatPercent } from './format';

/** Fecha de corte usada por el dataset de demostración. */
const REFERENCE = new Date('2026-09-14T00:00:00');

describe('formatLiters', () => {
  it('redondea y añade la unidad con separador de miles', () => {
    expect(formatLiters(1500)).toBe('1.500 L');
    expect(formatLiters(1499.6)).toBe('1.500 L');
  });
});

describe('formatPercent', () => {
  it('usa coma decimal', () => {
    expect(formatPercent(1.5)).toBe('1,5 %');
  });
});

describe('formatDateNumeric', () => {
  it('produce el formato de corte dd/mm/aaaa', () => {
    expect(formatDateNumeric('2026-09-14T00:00:00')).toBe('14/09/2026');
  });

  it('trata la fecha civil sin hora como local, no como UTC', () => {
    // Regresión: `new Date('2026-01-10')` es medianoche UTC y en husos al oeste
    // de Greenwich se mostraba como 09/01/2026.
    expect(formatDateNumeric('2026-01-10')).toBe('10/01/2026');
  });
});

describe('formatDate', () => {
  it('devuelve un guion cuando no hay fecha', () => {
    expect(formatDate(null)).toBe('—');
  });

  it('devuelve el valor original si la fecha es ilegible', () => {
    expect(formatDate('no-es-fecha')).toBe('no-es-fecha');
  });

  it('formatea una fecha válida', () => {
    const formatted = formatDate('2026-09-14T00:00:00');
    expect(formatted).toContain('14');
    expect(formatted).toContain('2026');
  });
});

describe('daysUntil', () => {
  it('cuenta los días que faltan hasta el vencimiento', () => {
    expect(daysUntil('2026-09-19', REFERENCE)).toBe(5);
    expect(daysUntil('2026-10-14', REFERENCE)).toBe(30);
  });

  it('devuelve un número negativo si ya venció', () => {
    expect(daysUntil('2026-09-10', REFERENCE)).toBe(-4);
  });

  it('devuelve null sin fecha o con fecha ilegible', () => {
    expect(daysUntil(null, REFERENCE)).toBeNull();
    expect(daysUntil('', REFERENCE)).toBeNull();
    expect(daysUntil('no-es-fecha', REFERENCE)).toBeNull();
  });

  it('no depende de un reloj global: la referencia es explícita', () => {
    const otroCorte = new Date('2026-09-15T00:00:00');
    expect(daysUntil('2026-09-19', REFERENCE)).toBe(5);
    expect(daysUntil('2026-09-19', otroCorte)).toBe(4);
  });
});
