/** Utilidades de formato y clasificación visual de estados. */

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral';

const numberFormat = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

export function formatNumber(value: number): string {
  return numberFormat.format(Math.round(value));
}

export function formatVolume(value: number): string {
  return `${numberFormat.format(Math.round(value))} L`;
}

export function formatLiters(value: number): string {
  return `${numberFormat.format(Math.round(value))} L`;
}

export function formatPercent(value: number): string {
  return `${percentFormat.format(value)} %`;
}

export function formatDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/** Días restantes hasta el vencimiento (negativo si ya venció). */
export function daysUntil(iso: string | null): number | null {
  if (!iso) {
    return null;
  }
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) {
    return null;
  }
  const reference = new Date('2026-09-14T00:00:00').getTime();
  return Math.round((target - reference) / 86_400_000);
}

export function toneForStatus(value: string): Tone {
  switch (value) {
    case 'green':
    case 'Vigente':
    case 'Cerrada':
    case 'Recibida':
    case 'Presentada':
    case 'Validada':
    case 'Conforme':
    case 'Disponible':
    case 'ok':
      return 'ok';
    case 'yellow':
    case 'Próximo a vencer':
    case 'Observada':
    case 'Observado':
    case 'Escalado':
    case 'En revisión':
    case 'Borrador':
    case 'En ejecución':
    case 'Próximo a vencer ':
    case 'warning':
    case 'observed':
      return 'warn';
    case 'red':
    case 'Vencido':
    case 'Crítico':
    case 'Abierta':
    case 'Escalada':
    case 'critical':
      return 'danger';
    case 'Programada':
    case 'En tránsito':
    case 'Registrada':
    case 'info':
      return 'info';
    default:
      return 'neutral';
  }
}

export function labelForSeverity(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'Crítica';
    case 'warning':
      return 'Advertencia';
    case 'info':
      return 'Informativa';
    default:
      return severity;
  }
}

export function labelForCompliance(level: string): string {
  switch (level) {
    case 'ok':
      return 'OK';
    case 'observed':
      return 'Observado';
    case 'critical':
      return 'Crítico';
    default:
      return level;
  }
}

export function labelForPlantStatus(status: string): string {
  switch (status) {
    case 'green':
      return 'Operación normal';
    case 'yellow':
      return 'Con observaciones';
    case 'red':
      return 'Crítico';
    default:
      return status;
  }
}

export function differenceTone(difference: number): Tone {
  const absolute = Math.abs(difference);
  if (absolute > 500) {
    return 'danger';
  }
  if (absolute > 200) {
    return 'warn';
  }
  return 'ok';
}
