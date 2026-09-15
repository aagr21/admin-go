import { UserRole } from '@core/models/enums';

/**
 * Permisos por **acción**, no solo por módulo (§6, §29).
 *
 * `role-access.ts` decide qué módulos puede *abrir* un rol; este módulo decide
 * qué puede *hacer* dentro de ellos. Sin esta segunda capa, un Auditor podría
 * editar en cuanto existiera un formulario, porque su rol sí tiene acceso al
 * módulo de documentos.
 *
 * El backend será la autoridad final; esta matriz es la misma política aplicada
 * en el cliente para no ofrecer acciones que van a ser rechazadas.
 */

export type Action = 'read' | 'create' | 'update' | 'close' | 'export' | 'validate' | 'configure';

export const ACTIONS: readonly Action[] = [
  'read',
  'create',
  'update',
  'close',
  'export',
  'validate',
  'configure',
];

const READ_ONLY: readonly Action[] = ['read', 'export'];

/** Capacidades de escritura por rol (§6). */
export const ROLE_ACTIONS: Record<UserRole, readonly Action[]> = {
  // Configuración general, clientes, usuarios, permisos y parámetros.
  'Superadministrador AdminGo': [
    'read',
    'create',
    'update',
    'close',
    'export',
    'validate',
    'configure',
  ],
  // Gestión de la empresa contratante.
  'Administrador cliente': ['read', 'create', 'update', 'export', 'validate'],
  // Indicadores, alertas, inventarios, operaciones y reportes.
  Gerente: ['read', 'export', 'validate'],
  // Documentos, requisitos, declaraciones y validaciones.
  'Responsable regulatorio': ['read', 'create', 'update', 'export', 'validate'],
  // Coordina controles de campo y seguimiento.
  'Supervisor operativo AdminGo': ['read', 'create', 'update', 'close', 'export'],
  // Registra recepciones, despachos, mediciones, precintos y evidencias.
  'Operador de campo': ['read', 'create', 'update', 'close'],
  // Gestiona su estación y tanques.
  'Responsable EESS': ['read', 'create', 'update'],
  // Consulta y auditoría sin modificar datos (§6).
  Auditor: READ_ONLY,
};

export function canPerform(role: UserRole | null, action: Action): boolean {
  return role !== null && ROLE_ACTIONS[role].includes(action);
}

/** Acciones de escritura concedidas a un rol, para mostrar en la UI. */
export function writableActions(role: UserRole | null): readonly Action[] {
  return role === null ? [] : ROLE_ACTIONS[role].filter((action) => action !== 'read');
}
