import { RuleConfig } from '@core/api/admin-go.api';

/**
 * Persistencia local de los parámetros configurables (§14).
 *
 * Mientras el backend no exponga `GET/PUT /settings`, los umbrales viven en el
 * navegador para que sobrevivan a una recarga. Es deliberadamente tolerante:
 * si el almacenamiento no está disponible la plataforma sigue funcionando con
 * los valores por defecto.
 */

const SETTINGS_KEY = 'admingo.settings';

export const DEFAULT_RULE_CONFIG: RuleConfig = {
  warningDays: 30,
  thresholdPercent: 1.5,
  stalledOperationDays: 3,
};

export function readStoredRuleConfig(): RuleConfig {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return { ...DEFAULT_RULE_CONFIG };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { ...DEFAULT_RULE_CONFIG };
    }
    const candidate = parsed as Partial<RuleConfig>;
    return {
      warningDays: positive(candidate.warningDays, DEFAULT_RULE_CONFIG.warningDays),
      thresholdPercent: positive(candidate.thresholdPercent, DEFAULT_RULE_CONFIG.thresholdPercent),
      stalledOperationDays: positive(
        candidate.stalledOperationDays,
        DEFAULT_RULE_CONFIG.stalledOperationDays,
      ),
    };
  } catch {
    return { ...DEFAULT_RULE_CONFIG };
  }
}

export function writeStoredRuleConfig(config: RuleConfig): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(config));
  } catch {
    /* sin almacenamiento: los parámetros viven solo en memoria */
  }
}

/** Un valor válido es un número finito y no negativo. */
function positive(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}
