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
      background: #dcfce7;
      color: #166534;
      border-color: #bbf7d0;
    }

    .badge--warn {
      background: #fef3c7;
      color: #92400e;
      border-color: #fde68a;
    }

    .badge--danger {
      background: #fee2e2;
      color: #991b1b;
      border-color: #fecaca;
    }

    .badge--info {
      background: #dbeafe;
      color: #1e40af;
      border-color: #bfdbfe;
    }

    .badge--neutral {
      background: #f1f5f9;
      color: #475569;
      border-color: #e2e8f0;
    }
  `,
})
export class StatusBadge {
  readonly label = input.required<string>();
  readonly tone = input<Tone>('neutral');
}
