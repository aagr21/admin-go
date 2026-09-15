import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AdminGoStore } from '@core/services/admin-go.store';
import { writableActions } from '@core/auth/permissions';
import { modulesForRole } from '@core/auth/role-access';
import { User } from '@core/models/entities';
import { USER_ROLES, UserRole } from '@core/models/enums';
import { StatusBadge } from '@shared/ui/status-badge';

/**
 * Módulo Usuarios y Roles (§6, §33 P1).
 *
 * Cubre las dos mitades del requisito: dar de alta usuarios de la empresa y
 * consultar qué puede hacer cada rol, que hasta ahora solo se podía leer como
 * una lista suelta dentro de Configuración.
 */
@Component({
  selector: 'app-users-page',
  imports: [ReactiveFormsModule, StatusBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ag-page">
      <header class="ag-page__head">
        <div>
          <h1 class="ag-page__title">Usuarios y roles</h1>
          <p class="ag-page__sub">
            Altas de usuario de la empresa y matriz de permisos por acción (§6).
          </p>
        </div>
        @if (canManage) {
          <button class="ag-btn ag-btn--primary" type="button" (click)="startCreate()">
            Nuevo usuario
          </button>
        }
      </header>

      @if (creating()) {
        <article class="ag-card">
          <p class="ag-card__title">Nuevo usuario</p>
          <form class="form" [formGroup]="createForm" (ngSubmit)="submitCreate()">
            <label class="field">
              <span>Usuario</span>
              <input type="text" formControlName="username" autocomplete="off" />
            </label>
            <label class="field">
              <span>Nombre completo</span>
              <input type="text" formControlName="fullName" />
            </label>
            <label class="field">
              <span>Correo</span>
              <input type="email" formControlName="email" />
            </label>
            <label class="field">
              <span>Rol</span>
              <select formControlName="role">
                @for (role of roles; track role) {
                  <option [value]="role">{{ role }}</option>
                }
              </select>
            </label>
            <label class="field">
              <span>Empresa</span>
              <select formControlName="companyId">
                @for (company of companies(); track company.id) {
                  <option [value]="company.id">{{ company.name }}</option>
                }
              </select>
            </label>
            <div class="ag-row form__actions">
              <button class="ag-btn ag-btn--primary" type="submit" [disabled]="busy()">
                Crear usuario
              </button>
              <button class="ag-btn" type="button" (click)="cancelCreate()">Cancelar</button>
            </div>
          </form>
        </article>
      }

      <article class="ag-card ag-card--flush">
        <div class="table-wrap">
          <table class="ag-table ag-table--stack">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Empresa</th>
                <th>Estado</th>
                @if (canManage) {
                  <th></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td data-label="Usuario" class="ag-mono">{{ user.username }}</td>
                  <td data-label="Nombre">{{ user.fullName }}</td>
                  <td data-label="Correo">{{ user.email }}</td>
                  <td data-label="Rol">
                    @if (canManage) {
                      <select
                        class="inline-select"
                        [value]="user.role"
                        (change)="changeRole(user, $event)"
                        [attr.aria-label]="'Rol de ' + user.username"
                      >
                        @for (role of roles; track role) {
                          <option [value]="role">{{ role }}</option>
                        }
                      </select>
                    } @else {
                      {{ user.role }}
                    }
                  </td>
                  <td data-label="Empresa">{{ companyName(user.companyId) }}</td>
                  <td data-label="Estado">
                    <app-status-badge
                      [label]="user.active ? 'Activo' : 'Desactivado'"
                      [tone]="user.active ? 'ok' : 'neutral'"
                    />
                  </td>
                  @if (canManage) {
                    <td data-label="">
                      <button class="ag-btn" type="button" (click)="toggleActive(user)">
                        {{ user.active ? 'Desactivar' : 'Activar' }}
                      </button>
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="canManage ? 7 : 6" class="ag-muted empty">
                    No hay usuarios visibles para tu ámbito.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </article>

      <article class="ag-card">
        <p class="ag-card__title">Matriz de permisos por rol (§6)</p>
        <p class="ag-card__sub">
          Un rol tiene que poder <em>abrir</em> el módulo y además tener la <em>acción</em>
          concedida: es la diferencia entre ver y modificar.
        </p>
        <div class="table-wrap">
          <table class="ag-table ag-table--stack">
            <thead>
              <tr>
                <th>Rol</th>
                <th>Acciones de escritura</th>
                <th class="ag-num">Módulos</th>
              </tr>
            </thead>
            <tbody>
              @for (role of roles; track role) {
                <tr>
                  <td data-label="Rol">{{ role }}</td>
                  <td data-label="Acciones de escritura">
                    @if (writableActionsFor(role).length === 0) {
                      <span class="ag-muted">Solo lectura (consulta y auditoría)</span>
                    } @else {
                      @for (action of writableActionsFor(role); track action) {
                        <span class="chip">{{ action }}</span>
                      }
                    }
                  </td>
                  <td data-label="Módulos" class="ag-num">{{ modulesFor(role).length }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </article>
    </section>
  `,
  styles: `
    .ag-page__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.85rem;
      margin-top: 0.85rem;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--ag-ink-soft);
    }

    .field input,
    .field select {
      padding: 0.5rem 0.65rem;
      border-radius: var(--ag-radius-sm);
      border: 1px solid var(--ag-line);
      font: inherit;
      font-weight: 400;
      text-transform: none;
      color: var(--ag-ink);
      background: var(--ag-surface);
    }

    .form__actions {
      grid-column: 1 / -1;
      gap: 0.6rem;
      align-items: center;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .empty {
      text-align: center;
      padding: 1.5rem;
    }

    .inline-select {
      padding: 0.25rem 0.4rem;
      border-radius: var(--ag-radius-sm);
      border: 1px solid var(--ag-line);
      font: inherit;
      background: var(--ag-surface);
      max-width: 220px;
    }

    .chip {
      display: inline-block;
      margin: 0 0.25rem 0.2rem 0;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      background: var(--ag-primary-050);
      color: var(--ag-primary-600);
      font-size: 0.7rem;
      font-weight: 600;
    }

    .ag-card + .ag-card {
      margin-top: 1.25rem;
    }
  `,
})
export class UsersPage {
  private readonly store = inject(AdminGoStore);
  private readonly forms = inject(FormBuilder);

  protected readonly roles = USER_ROLES;
  protected readonly users = this.store.users;
  protected readonly companies = this.store.companies;
  protected readonly busy = this.store.busy;
  protected readonly canManage = this.store.can('configure');

  protected readonly creating = signal(false);

  protected readonly createForm = this.forms.nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(/^[a-z0-9._-]+$/)]],
    fullName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: ['Operador de campo' as UserRole, Validators.required],
    companyId: ['', Validators.required],
  });

  protected startCreate(): void {
    this.createForm.reset({
      username: '',
      fullName: '',
      email: '',
      role: 'Operador de campo',
      companyId: this.companies()[0]?.id ?? '',
    });
    this.creating.set(true);
  }

  protected cancelCreate(): void {
    this.creating.set(false);
  }

  protected async submitCreate(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const value = this.createForm.getRawValue();
    await this.store.createUser({ ...value, active: true });
    this.creating.set(false);
  }

  protected async toggleActive(user: User): Promise<void> {
    await this.store.updateUser(user.id, { active: !user.active });
  }

  protected async changeRole(user: User, event: Event): Promise<void> {
    const role = (event.target as HTMLSelectElement).value as UserRole;
    if (role === user.role) {
      return;
    }
    await this.store.updateUser(user.id, { role });
  }

  protected companyName(companyId: string): string {
    return this.store.companyById(companyId)?.name ?? '—';
  }

  protected writableActionsFor(role: UserRole): readonly string[] {
    return writableActions(role);
  }

  protected modulesFor(role: UserRole): readonly string[] {
    return modulesForRole(role);
  }
}
