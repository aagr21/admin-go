import { AgDocument, Company, Declaration, Operation, Requirement } from '@core/models/entities';
import { ComplianceLevel } from '@core/models/enums';
import { currentVersionOf, documentStatusOf } from './document-status';
import { classifyVolumeDifference, volumeDifferencePercent } from './volume-difference';

/**
 * Validación previa de una declaración — CHECK ADMIN GO (§18).
 *
 * Motor de reglas puro: recibe los datos ya acotados y devuelve hallazgos
 * tipificados. No consulta el store ni el reloj, de modo que es determinista
 * y comprobable. El nivel global se deriva de los hallazgos.
 */

/** Reglas del CHECK ADMIN GO (§18). */
export type FindingCode =
  | 'campos-obligatorios'
  | 'documentos-faltantes'
  | 'operaciones-abiertas'
  | 'duplicados'
  | 'diferencias-volumetricas'
  | 'inconsistencia-documento-operacion'
  | 'periodo-incompleto';

export interface ValidationFinding {
  code: FindingCode;
  /** Un hallazgo nunca es 'ok': o es observado o es crítico. */
  level: Exclude<ComplianceLevel, 'ok'>;
  title: string;
  detail: string;
  /** Referencias afectadas, para poder navegar desde la UI. */
  entityRefs: string[];
}

export interface DeclarationValidationInput {
  declaration: Declaration;
  company: Company | undefined;
  /** Operaciones consolidadas en la declaración. */
  operations: readonly Operation[];
  /** Documentos que respaldan la declaración. */
  documents: readonly AgDocument[];
  /** Catálogo de requisitos vigentes (§16). */
  requirements: readonly Requirement[];
  /** Universo completo, para detectar duplicados entre declaraciones. */
  allOperations: readonly Operation[];
  warningDays: number;
  thresholdPercent: number;
  reference: Date;
}

const OPEN_OPERATION_STATUSES: readonly Operation['status'][] = [
  'Programada',
  'En tránsito',
  'Recibida',
];

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Ejecuta todas las reglas del §18 sobre una declaración. */
export function validateDeclaration(input: DeclarationValidationInput): ValidationFinding[] {
  const { declaration, company, operations, documents, requirements } = input;
  const findings: ValidationFinding[] = [];

  // 1. Campos obligatorios.
  const missing = [
    !declaration.period ? 'periodo' : null,
    !declaration.responsible ? 'responsable' : null,
    !declaration.companyId ? 'empresa' : null,
    operations.length === 0 ? 'operaciones' : null,
  ].filter((value): value is string => value !== null);
  if (missing.length > 0) {
    findings.push({
      code: 'campos-obligatorios',
      level: 'critical',
      title: 'Campos obligatorios incompletos',
      detail: `Faltan: ${missing.join(', ')}.`,
      entityRefs: [declaration.code],
    });
  }

  // 2. Documentos faltantes: requisito activo sin respaldo vigente.
  const applicable = requirements.filter(
    (requirement) =>
      requirement.active &&
      (requirement.clientKinds.length === 0 ||
        (company !== undefined && requirement.clientKinds.includes(company.kind))),
  );
  const missingRequirements = applicable.filter((requirement) => {
    const backing = documents.filter((document) => document.code === requirement.code);
    if (backing.length === 0) {
      return true;
    }
    return backing.every((document) => {
      const status = documentStatusOf(document, input.warningDays, input.reference);
      return status === 'Vencido' || status === 'Faltante';
    });
  });
  const mandatoryMissing = missingRequirements.filter((requirement) => requirement.mandatory);
  if (mandatoryMissing.length > 0) {
    findings.push({
      code: 'documentos-faltantes',
      level: 'critical',
      title: 'Requisitos obligatorios sin respaldo',
      detail: mandatoryMissing.map((requirement) => requirement.code).join(', '),
      entityRefs: mandatoryMissing.map((requirement) => requirement.code),
    });
  }
  const optionalMissing = missingRequirements.filter((requirement) => !requirement.mandatory);
  if (optionalMissing.length > 0) {
    findings.push({
      code: 'documentos-faltantes',
      level: 'observed',
      title: 'Requisitos opcionales sin respaldo',
      detail: optionalMissing.map((requirement) => requirement.code).join(', '),
      entityRefs: optionalMissing.map((requirement) => requirement.code),
    });
  }

  // 3. Operaciones abiertas dentro del periodo.
  const open = operations.filter((operation) => OPEN_OPERATION_STATUSES.includes(operation.status));
  const observed = operations.filter((operation) => operation.status === 'Observada');
  if (observed.length > 0) {
    findings.push({
      code: 'operaciones-abiertas',
      level: 'critical',
      title: 'Operaciones observadas sin resolver',
      detail: `${observed.length} operación(es) marcadas como observadas.`,
      entityRefs: observed.map((operation) => operation.code),
    });
  }
  if (open.length > 0) {
    findings.push({
      code: 'operaciones-abiertas',
      level: 'observed',
      title: 'Operaciones sin cierre',
      detail: `${open.length} operación(es) siguen abiertas en el periodo.`,
      entityRefs: open.map((operation) => operation.code),
    });
  }

  // 4. Duplicados.
  const duplicatedIds = declaration.operationIds.filter(
    (id, index) => declaration.operationIds.indexOf(id) !== index,
  );
  const duplicatedCodes = findDuplicatedCodes(input.allOperations);
  if (duplicatedIds.length > 0 || duplicatedCodes.length > 0) {
    findings.push({
      code: 'duplicados',
      level: 'critical',
      title: 'Registros duplicados',
      detail:
        duplicatedIds.length > 0
          ? `Operaciones repetidas en la declaración: ${[...new Set(duplicatedIds)].join(', ')}.`
          : `Códigos de operación repetidos: ${duplicatedCodes.join(', ')}.`,
      entityRefs: [...new Set([...duplicatedIds, ...duplicatedCodes])],
    });
  }

  // 5. Diferencias volumétricas contra el umbral configurable (§14).
  const worst = operations.reduce<{ ref: string; percent: number } | null>((acc, operation) => {
    const percent = volumeDifferencePercent(
      operation.receivedVolume - operation.documentedVolume,
      operation.documentedVolume,
    );
    if (acc === null || Math.abs(percent) > Math.abs(acc.percent)) {
      return { ref: operation.code, percent };
    }
    return acc;
  }, null);
  if (worst !== null) {
    const level = classifyVolumeDifference(worst.percent, input.thresholdPercent);
    if (level !== 'conforme') {
      findings.push({
        code: 'diferencias-volumetricas',
        level: level === 'critico' ? 'critical' : 'observed',
        title: 'Diferencia volumétrica fuera de parámetro',
        detail: `${worst.ref}: ${worst.percent.toFixed(2)} % (umbral ${input.thresholdPercent} %).`,
        entityRefs: [worst.ref],
      });
    }
  }

  // 6. Inconsistencias documento–operación.
  const declaredOperationIds = new Set(declaration.operationIds);
  const orphanDocuments = documents.filter(
    (document) => document.operationId !== null && !declaredOperationIds.has(document.operationId),
  );
  if (orphanDocuments.length > 0) {
    findings.push({
      code: 'inconsistencia-documento-operacion',
      level: 'observed',
      title: 'Documentos asociados a operaciones fuera del periodo',
      detail: orphanDocuments.map((document) => document.code).join(', '),
      entityRefs: orphanDocuments.map((document) => document.code),
    });
  }
  if (documents.some((document) => currentVersionOf(document) === 0)) {
    findings.push({
      code: 'inconsistencia-documento-operacion',
      level: 'observed',
      title: 'Documentos sin versión cargada',
      detail: 'Hay expedientes declarados sin ningún archivo asociado.',
      entityRefs: documents.filter((d) => currentVersionOf(d) === 0).map((d) => d.code),
    });
  }

  // 7. Periodos incompletos.
  if (!PERIOD_PATTERN.test(declaration.period)) {
    findings.push({
      code: 'periodo-incompleto',
      level: 'critical',
      title: 'Periodo con formato inválido',
      detail: `Se espera AAAA-MM y se recibió «${declaration.period}».`,
      entityRefs: [declaration.code],
    });
  }

  return findings;
}

/** Nivel CHECK ADMIN GO resultante (§18): OK / OBSERVADO / CRÍTICO. */
export function complianceLevelOf(findings: readonly ValidationFinding[]): ComplianceLevel {
  if (findings.some((finding) => finding.level === 'critical')) {
    return 'critical';
  }
  return findings.some((finding) => finding.level === 'observed') ? 'observed' : 'ok';
}

function findDuplicatedCodes(operations: readonly Operation[]): string[] {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const operation of operations) {
    if (seen.has(operation.code)) {
      duplicated.add(operation.code);
    }
    seen.add(operation.code);
  }
  return [...duplicated];
}
