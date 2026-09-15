/**
 * Utilidades de formato para presentación.
 *
 * Solo transforman valores: no conocen los vocabularios del dominio (eso vive
 * en `status.ts`) ni la fecha de corte del dataset (eso vive en
 * `core/data/dataset-date`). Las funciones relativas al tiempo reciben la fecha
 * de referencia como parámetro para no depender de un reloj global oculto.
 */

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

const NUMBER_FORMAT = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 });
const PERCENT_FORMAT = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const NUMERIC_DATE_FORMAT = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const MILLISECONDS_PER_DAY = 86_400_000;

/** Fecha civil sin hora, p. ej. "2026-01-10". */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Formatea litros con separador de miles boliviano. */
export function formatLiters(value: number): string {
  return `${NUMBER_FORMAT.format(Math.round(value))} L`;
}

export function formatPercent(value: number): string {
  return `${PERCENT_FORMAT.format(value)} %`;
}

/** Fecha corta legible, p. ej. "14 sept 2026". */
export function formatDate(iso: string | null): string {
  const date = parseDate(iso);
  return date ? SHORT_DATE_FORMAT.format(date) : placeholderFor(iso);
}

/** Fecha numérica para cortes de reporte, p. ej. "14/09/2026". */
export function formatDateNumeric(iso: string | null): string {
  const date = parseDate(iso);
  return date ? NUMERIC_DATE_FORMAT.format(date) : placeholderFor(iso);
}

/** Fecha y hora, p. ej. "14/09/2026, 09:30". */
export function formatDateTime(iso: string | null): string {
  const date = parseDate(iso);
  return date ? DATE_TIME_FORMAT.format(date) : placeholderFor(iso);
}

/**
 * Días desde `reference` hasta `iso` (negativo si ya venció).
 * Devuelve `null` cuando la fecha es nula o inválida.
 */
export function daysUntil(iso: string | null, reference: Date): number | null {
  const target = parseDate(iso);
  if (!target) {
    return null;
  }
  return Math.round((target.getTime() - reference.getTime()) / MILLISECONDS_PER_DAY);
}

/** `Date` válido a partir de un ISO, o `null` si viene vacío o corrupto. */
function parseDate(iso: string | null): Date | null {
  if (!iso) {
    return null;
  }
  // `new Date('2026-01-10')` se interpreta como medianoche UTC y en husos al
  // oeste de Greenwich se muestra un día antes. Las fechas sin hora del dataset
  // son fechas civiles: se anclan a medianoche local.
  const normalized = DATE_ONLY_PATTERN.test(iso) ? `${iso}T00:00:00` : iso;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Guion de "sin dato"; si el ISO era ilegible se muestra tal cual. */
function placeholderFor(iso: string | null): string {
  return iso ?? '—';
}
