import { classifyVolumeDifference, volumeDifferencePercent } from './volume-difference';

describe('volumeDifferencePercent', () => {
  it('expresa la desviación como porcentaje del volumen de referencia', () => {
    expect(volumeDifferencePercent(150, 10_000)).toBeCloseTo(1.5);
    expect(volumeDifferencePercent(-150, 10_000)).toBeCloseTo(-1.5);
  });

  it('devuelve 0 cuando no hay volumen de referencia', () => {
    expect(volumeDifferencePercent(500, 0)).toBe(0);
  });
});

describe('classifyVolumeDifference', () => {
  it('clasifica contra el umbral y su mitad (§14)', () => {
    expect(classifyVolumeDifference(2, 1.5)).toBe('critico');
    expect(classifyVolumeDifference(1, 1.5)).toBe('observado');
    expect(classifyVolumeDifference(0.5, 1.5)).toBe('conforme');
  });

  it('evalúa la magnitud, no el signo', () => {
    expect(classifyVolumeDifference(-2, 1.5)).toBe('critico');
    expect(classifyVolumeDifference(-1, 1.5)).toBe('observado');
  });

  it('considera el umbral exacto observado, no crítico', () => {
    expect(classifyVolumeDifference(1.5, 1.5)).toBe('observado');
    expect(classifyVolumeDifference(0.75, 1.5)).toBe('conforme');
  });

  it('con umbral 0 toda desviación es crítica y el cero es conforme', () => {
    expect(classifyVolumeDifference(0.1, 0)).toBe('critico');
    expect(classifyVolumeDifference(0, 0)).toBe('conforme');
  });
});
