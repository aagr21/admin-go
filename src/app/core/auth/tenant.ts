import { User } from '@core/models/entities';
import { UserRole } from '@core/models/enums';

/**
 * Ámbito de visibilidad por empresa (§29 «Arquitectura multiempresa»).
 *
 * Los dos roles de AdminGo miran la red nacional completa; el resto de roles
 * son personal del cliente y solo deben ver datos de su propia empresa.
 *
 * **Aviso:** esto es una salvaguarda de interfaz, no seguridad. El aislamiento
 * real tiene que imponerlo el backend en cada consulta; mientras no exista,
 * esto evita que un cliente *vea* datos de otro, pero no los protege.
 */

/** Roles con visión de toda la red. */
export const CROSS_COMPANY_ROLES: readonly UserRole[] = [
  'Superadministrador AdminGo',
  'Supervisor operativo AdminGo',
];

export interface TenantScope {
  /** `true` cuando el usuario ve todas las empresas. */
  global: boolean;
  /** Empresa del usuario; `null` si no hay sesión. */
  companyId: string | null;
}

export function tenantScopeOf(user: User | null): TenantScope {
  if (!user) {
    return { global: false, companyId: null };
  }
  if (CROSS_COMPANY_ROLES.includes(user.role)) {
    return { global: true, companyId: user.companyId };
  }
  return { global: false, companyId: user.companyId };
}

/** Filtra una colección con `companyId` según el ámbito. */
export function scopedToCompany<T extends { companyId: string }>(
  items: readonly T[],
  scope: TenantScope,
): T[] {
  if (scope.global) {
    return [...items];
  }
  if (scope.companyId === null) {
    return [];
  }
  return items.filter((item) => item.companyId === scope.companyId);
}
