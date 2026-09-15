/**
 * Regla de negocio de diferencias volumétricas (§14).
 *
 * Módulo puro y sin dependencias de presentación. Lo consumen tanto la UI (para
 * el semáforo) como los reportes exportables (para la etiqueta), de forma que
 * ambos clasifican una misma diferencia con el mismo criterio y el umbral
 * configurable por cliente.
 */

/** Grado de desviación de una diferencia volumétrica frente al umbral. */
export type DifferenceLevel = 'conforme' | 'observado' | 'critico';

/** Diferencia porcentual de `difference` respecto a `referenceVolume`. */
export function volumeDifferencePercent(difference: number, referenceVolume: number): number {
  return referenceVolume === 0 ? 0 : (difference / referenceVolume) * 100;
}

/**
 * Clasifica una diferencia porcentual contra el umbral configurado (§14):
 * por encima del umbral es crítica, por encima de la mitad es observada.
 * El signo es irrelevante: se evalúa la magnitud de la desviación.
 */
export function classifyVolumeDifference(
  percentDifference: number,
  thresholdPercent: number,
): DifferenceLevel {
  const magnitude = Math.abs(percentDifference);
  if (magnitude > thresholdPercent) {
    return 'critico';
  }
  return magnitude > thresholdPercent / 2 ? 'observado' : 'conforme';
}
