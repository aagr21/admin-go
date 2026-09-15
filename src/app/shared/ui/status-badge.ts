import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tone } from '../util/format';

/**
 * Insignia de estado reutilizable para documentos, operaciones, plantas y alertas.
 * Componente de presentación con plantilla en línea (pequeño y sin lógica).
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'badge badge--' + tone()">{{ label() }}</span>`,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.15rem 0.6rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      line-height: 1.6;
      white-space: nowrap;
      border: 1px solid transparent;
    }

    .badge--ok {
      background: var(--ag-ok-bg);
      color: var(--ag-ok-ink);
      border-color: var(--ag-ok-line);
    }

    .badge--warn {
      background: var(--ag-warn-bg);
      color: var(--ag-warn-ink);
      border-color: var(--ag-warn-line);
    }

    .badge--danger {
      background: var(--ag-danger-bg);
      color: var(--ag-danger-ink);
      border-color: var(--ag-danger-line);
    }

    .badge--info {
      background: var(--ag-info-bg);
      color: var(--ag-info-ink);
      border-color: var(--ag-info-line);
    }

    .badge--neutral {
      background: var(--ag-neutral-bg);
      color: var(--ag-neutral-ink);
      border-color: var(--ag-neutral-line);
    }
  `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('neutral');
}
