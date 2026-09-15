import { AgDocument } from '@core/models/entities';
import { DocumentStatus } from '@core/models/enums';
import { daysUntil } from '@shared/util/format';

/**
 * Estado documental de un expediente (§15, §18).
 *
 * **Fuente única de verdad.** Ni el Dashboard ni los reportes deben leer el
 * campo `status` almacenado para decidir vencimientos: ambos pasan por aquí.
 * Antes cada uno lo calculaba a su manera y podían contradecirse.
 *
 * `Faltante` y `Observado` son calificaciones humanas (requisito sin respaldo,
 * documento que requiere revisión) y se respetan tal cual. El resto se deriva
 * de la fecha de vencimiento y de los días de aviso configurados (§14).
 */
export function documentStatusOf(
  document: AgDocument,
  warningDays: number,
  reference: Date,
): DocumentStatus {
  if (document.status === 'Faltante' || document.status === 'Observado') {
    return document.status;
  }
  const days = daysUntil(document.expiresAt, reference);
  if (days === null) {
    return document.status;
  }
  if (days < 0) {
    return 'Vencido';
  }
  return days <= warningDays ? 'Próximo a vencer' : 'Vigente';
}

/** Documento con su estado y días restantes ya resueltos (§15). */
export interface ClassifiedDocument {
  document: AgDocument;
  /** Días hasta el vencimiento; `null` si el documento no vence. */
  days: number | null;
  status: DocumentStatus;
  /** Versión vigente del expediente (§15 «Versiones»). */
  currentVersion: number;
}

/** Versión vigente de un expediente: la última cargada (§15). */
export function currentVersionOf(document: AgDocument): number {
  return document.versions.length === 0
    ? 0
    : document.versions[document.versions.length - 1].version;
}

export function classifyDocuments(
  documents: readonly AgDocument[],
  warningDays: number,
  reference: Date,
): ClassifiedDocument[] {
  return documents.map((document) => ({
    document,
    days: daysUntil(document.expiresAt, reference),
    status: documentStatusOf(document, warningDays, reference),
    currentVersion: currentVersionOf(document),
  }));
}
