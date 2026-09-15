import { AgDocument, Company, Requirement } from '@core/models/entities';
import { DocumentStatus } from '@core/models/enums';
import { documentStatusOf } from './document-status';

/**
 * Matriz de cumplimiento (§16).
 *
 * Responde a la pregunta del documento: REQUISITO → DOCUMENTO → ESTADO →
 * EVIDENCIA → RESPONSABLE → FECHA, configurable por tipo de cliente y
 * actividad. Se calcula como producto requisitos × empresas, porque un mismo
 * requisito se cumple o no según el tipo de cliente.
 */

/** Estado de una celda: los del §15 más «no aplica» al tipo de cliente. */
export type CoverageStatus = DocumentStatus | 'No aplica';

export interface CoverageCell {
  requirement: Requirement;
  company: Company;
  status: CoverageStatus;
  /** Documentos que respaldan el requisito en esa empresa. */
  documents: AgDocument[];
  /** Responsable del expediente vigente, si lo hay (§15). */
  responsible: string | null;
  /** Vencimiento del expediente vigente más relevante. */
  expiresAt: string | null;
}

/** Peor estado primero: una matriz enseña el riesgo, no el promedio. */
const STATUS_SEVERITY: Record<DocumentStatus, number> = {
  Vencido: 4,
  Faltante: 3,
  Observado: 2,
  'Próximo a vencer': 1,
  Vigente: 0,
};

export function buildComplianceMatrix(
  requirements: readonly Requirement[],
  companies: readonly Company[],
  documents: readonly AgDocument[],
  warningDays: number,
  reference: Date,
): CoverageCell[] {
  const cells: CoverageCell[] = [];
  for (const requirement of requirements) {
    for (const company of companies) {
      const applicable =
        requirement.clientKinds.length === 0 || requirement.clientKinds.includes(company.kind);
      if (!applicable) {
        cells.push({
          requirement,
          company,
          status: 'No aplica',
          documents: [],
          responsible: null,
          expiresAt: null,
        });
        continue;
      }
      const backing = documents.filter(
        (document) => document.companyId === company.id && document.code === requirement.code,
      );
      if (backing.length === 0) {
        cells.push({
          requirement,
          company,
          status: 'Faltante',
          documents: [],
          responsible: null,
          expiresAt: null,
        });
        continue;
      }
      const evaluated = backing.map((document) => ({
        document,
        status: documentStatusOf(document, warningDays, reference),
      }));
      const worst = evaluated.reduce((acc, item) =>
        STATUS_SEVERITY[item.status] > STATUS_SEVERITY[acc.status] ? item : acc,
      );
      cells.push({
        requirement,
        company,
        status: worst.status,
        documents: backing,
        responsible: worst.document.responsible,
        expiresAt: worst.document.expiresAt,
      });
    }
  }
  return cells;
}

/** Resumen de cumplimiento de una empresa, para indicadores. */
export function coverageSummary(cells: readonly CoverageCell[]): Record<CoverageStatus, number> {
  const summary: Record<CoverageStatus, number> = {
    Vigente: 0,
    'Próximo a vencer': 0,
    Vencido: 0,
    Faltante: 0,
    Observado: 0,
    'No aplica': 0,
  };
  for (const cell of cells) {
    summary[cell.status]++;
  }
  return summary;
}
