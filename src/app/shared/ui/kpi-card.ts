import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Tone } from '../util/format';

/** Tarjeta de indicador para el Dashboard / Control Tower (§8). */
@Component({
  selector: 'app-kpi-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article [class]="'kpi kpi--' + tone()">
      <div class="kpi__top">
        <span class="kpi__label">{{ label() }}</span>
        @if (icon()) {
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path [attr.d]="icon()" />
          </svg>
        }
      </div>
      <p class="kpi__value">{{ value() }}</p>
      @if (hint()) {
        <p class="kpi__hint">{{ hint() }}</p>
      }
    </article>
  `,
  styles: `
    .kpi {
      position: relative;
      background: var(--ag-surface);
      border: 1px solid var(--ag-line);
      border-radius: var(--ag-radius);
      padding: 1rem 1.1rem;
      box-shadow: var(--ag-shadow);
      overflow: hidden;
    }

    .kpi::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: var(--ag-ink-muted);
    }

    .kpi--ok::before {
      background: var(--ag-ok);
    }

    .kpi--warn::before {
      background: var(--ag-warn);
    }

    .kpi--danger::before {
      background: var(--ag-danger);
    }

    .kpi--info::before {
      background: var(--ag-info);
    }

    .kpi__top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      color: #64748b;
    }

    .kpi__top svg {
      fill: #cbd5e1;
      flex: none;
    }

    .kpi--ok .kpi__top svg {
      fill: #86efac;
    }

    .kpi--warn .kpi__top svg {
      fill: #fcd34d;
    }

    .kpi--danger .kpi__top svg {
      fill: #fca5a5;
    }

    .kpi--info .kpi__top svg {
      fill: #93c5fd;
    }

    .kpi__label {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .kpi__value {
      margin: 0.5rem 0 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ag-ink);
      font-variant-numeric: tabular-nums;
    }

    .kpi__hint {
      margin: 0.25rem 0 0;
      font-size: 0.78rem;
      color: #64748b;
    }
  `,
})
export class KpiCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input<string>('');
  readonly tone = input<Tone>('neutral');
  readonly icon = input<string>('');
}
