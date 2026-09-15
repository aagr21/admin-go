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
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem 1.1rem;
      box-shadow:
        0 1px 2px rgba(15, 23, 42, 0.06),
        0 8px 24px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }

    .kpi::before {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: #94a3b8;
    }

    .kpi--ok::before {
      background: #16a34a;
    }

    .kpi--warn::before {
      background: #f59e0b;
    }

    .kpi--danger::before {
      background: #dc2626;
    }

    .kpi--info::before {
      background: #2563eb;
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
      color: #0f172a;
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
