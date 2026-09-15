/**
 * Fecha de corte del dataset de demostración.
 *
 * El prototipo aún no tiene backend: todos los registros de `mock-data` están
 * anclados al 14/09/2026. Esta constante es la **única fuente de verdad** de esa
 * fecha; cualquier cálculo relativo (vencimientos, antigüedad, cortes de
 * reporte) parte de aquí, de modo que sustituir el dataset por la API real sea
 * un cambio local y no una cacería de fechas dispersas.
 */
export const DATASET_DATE_ISO = '2026-09-14T00:00:00';

/** Marca de tiempo del último corte que muestra la barra superior del Shell. */
export const DATASET_LAST_SYNC_ISO = '2026-09-14T09:30:00';

/** Copia nueva de la fecha de corte (evita compartir un `Date` mutable). */
export function datasetDate(): Date {
  return new Date(DATASET_DATE_ISO);
}
