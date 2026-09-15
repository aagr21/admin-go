import { UserRole } from '@core/models/enums';
import { NavGroup } from '../layout/navigation';

/**
 * Matriz de acceso por rol (§6): módulos (primer segmento de ruta) que cada
 * rol puede abrir. En el prototipo vive en el cliente; en producción (§29)
 * el backend será la fuente de verdad de los permisos.
 */
export const ROLE_MODULES: Record<UserRole, readonly string[]> = {
  'Superadministrador AdminGo': [
    'dashboard',
    'operations',
    'plants',
    'stations',
    'tanks',
    'cisterns',
    'documents',
    'declarations',
    'volumes',
    'quality',
    'alerts',
    'companies',
    'reports',
    'audit',
    'settings',
  ],
  // Gestión de la empresa contratante.
  'Administrador cliente': [
    'dashboard',
    'operations',
    'documents',
    'declarations',
    'reports',
    'companies',
  ],
  // Indicadores, alertas, inventarios, operaciones y reportes.
  Gerente: ['dashboard', 'operations', 'plants', 'tanks', 'volumes', 'alerts', 'reports'],
  // Documentos, requisitos, declaraciones y validaciones.
  'Responsable regulatorio': [
    'dashboard',
    'documents',
    'declarations',
    'quality',
    'alerts',
    'settings',
  ],
  // Coordina controles de campo y seguimiento.
  'Supervisor operativo AdminGo': [
    'dashboard',
    'operations',
    'plants',
    'cisterns',
    'volumes',
    'alerts',
  ],
  // Registra recepciones, despachos, mediciones, precintos y evidencias.
  'Operador de campo': ['dashboard', 'operations', 'volumes', 'tanks', 'cisterns'],
  // Gestiona su estación y tanques.
  'Responsable EESS': ['dashboard', 'stations', 'tanks', 'volumes'],
  // Consulta y auditoría sin modificar datos.
  Auditor: [
    'dashboard',
    'audit',
    'reports',
    'documents',
    'declarations',
    'volumes',
    'quality',
    'alerts',
  ],
};

export function modulesForRole(role: UserRole): readonly string[] {
  return ROLE_MODULES[role];
}

/** Indica si el rol puede abrir la URL (se compara el primer segmento). */
export function canAccessModule(role: UserRole | null, url: string): boolean {
  if (!role) {
    return false;
  }
  const segment = url.replace(/^\/+/, '').split(/[/?;]/)[0];
  return modulesForRole(role).includes(segment === '' ? 'dashboard' : segment);
}

/** Filtra el menú lateral (§7) dejando solo los módulos permitidos al rol. */
export function filterNavGroups(groups: NavGroup[], role: UserRole | null): NavGroup[] {
  if (!role) {
    return [];
  }
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessModule(role, item.path)),
    }))
    .filter((group) => group.items.length > 0);
}
