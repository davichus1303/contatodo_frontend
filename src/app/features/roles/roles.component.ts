import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { RolesService } from '@core/application/roles/roles.service';
import { Role } from '@core/domain/models/role.model';
import { Module } from '@core/domain/models/module.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { I18nService } from '@core/i18n/i18n.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '@shared/components/confirmation-dialog/confirmation-dialog.component';
import { UpdateRoleRequest } from '@core/application/dto/role-request.dto';
import { ModulesNavigationComponent } from '../../layout/modules-navigation/modules-navigation.component';

interface RoleView extends Role {
  displayModules: string[];
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    ModulesNavigationComponent
  ],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RolesComponent {
  private readonly rolesService = inject(RolesService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  readonly i18nService = inject(I18nService);

  readonly searchControl = new FormControl<string>('');
  readonly searchTerm = signal<string>('');
  readonly roles = signal<RoleView[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly updatingIds = signal<Set<string>>(new Set());
  readonly deletingIds = signal<Set<string>>(new Set());

  readonly filteredRoles = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const source = this.roles();

    if (!term) {
      return source;
    }

    return source.filter((role: RoleView) =>
      role.name.toLowerCase().includes(term)
    );
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string | null) => {
        this.searchTerm.set(value?.trim().toLowerCase() ?? '');
      });
    this.loadRoles();
  }

  loadRoles(): void {
    if (this.isLoading()) {
      return;
    }

    this.isLoading.set(true);

    forkJoin({
      roles: this.rolesService.getRoles(),
      modules: this.rolesService.getModules()
    }).subscribe({
      next: (responses: {
        roles: ApiResponse<Role[]>;
        modules: ApiResponse<Module[]>;
      }) => {
        const rolesData = responses.roles.data ?? [];
        const modulesData = responses.modules.data ?? [];
        const moduleMap = new Map<string, string>();

        modulesData.forEach((module: Module) => {
          moduleMap.set(module.id, module.name);
        });

        const roleViews: RoleView[] = rolesData.map((role: Role) => ({
          ...role,
          displayModules: this.resolveModuleNames(role, moduleMap)
        }));

        this.roles.set(roleViews);
        this.isLoading.set(false);
      },
      error: (error: { error?: unknown }) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('ROLES.MESSAGES.ERROR_LOADING'))
        );
        this.isLoading.set(false);
      }
    });
  }

  getModuleNames(role: RoleView): string {
    return role.displayModules.join(', ');
  }

  private resolveModuleNames(role: Role, moduleMap: Map<string, string>): string[] {
    const names: string[] = [];

    role.permissions.forEach((permission) => {
      const hasRelevantPermission =
        permission.permissions.create ||
        permission.permissions.update ||
        permission.permissions.view;

      if (hasRelevantPermission) {
        const moduleName = moduleMap.get(permission.moduleOid);
        if (moduleName) {
          names.push(moduleName);
        }
      }
    });

    return names;
  }

  isUpdating(id: string): boolean {
    return this.updatingIds().has(id);
  }

  isDeleting(id: string): boolean {
    return this.deletingIds().has(id);
  }

  /**
   * Opens the confirmation dialog to delete a role.
   *
   * If the user cancels, the dialog is closed and no action is applied.
   * If the user confirms, the DELETE endpoint is called for the role.
   *
   * @param role Selected role to delete.
   */
  onDelete(role: RoleView): void {
    const dialogRef = this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(
      ConfirmationDialogComponent,
      {
        width: '420px',
        data: {
          titleKey: 'ROLES.MESSAGES.CONFIRM_DELETE_TITLE',
          messageKey: 'ROLES.MESSAGES.CONFIRM_DELETE_MESSAGE',
          cancelKey: 'ROLES.MESSAGES.CANCEL',
          confirmKey: 'ROLES.MESSAGES.DELETE',
          messageParams: { roleName: role.name }
        }
      }
    );

    dialogRef.afterClosed().subscribe((confirmed?: boolean) => {
      if (confirmed) {
        this.deleteRole(role);
      }
    });
  }

  onToggleChange(role: RoleView, event: MatSlideToggleChange): void {
    const activating = event.checked;

    const titleKey = activating
      ? 'ROLES.MESSAGES.CONFIRM_ACTIVATE_TITLE'
      : 'ROLES.MESSAGES.CONFIRM_DEACTIVATE_TITLE';

    const messageKey = activating
      ? 'ROLES.MESSAGES.CONFIRM_ACTIVATE_MESSAGE'
      : 'ROLES.MESSAGES.CONFIRM_DEACTIVATE_MESSAGE';

    const dialogRef = this.dialog.open<ConfirmationDialogComponent, ConfirmationDialogData, boolean>(
      ConfirmationDialogComponent,
      {
        width: '420px',
        data: {
          titleKey,
          messageKey,
          cancelKey: 'ROLES.MESSAGES.CANCEL',
          confirmKey: 'ROLES.MESSAGES.SAVE',
          messageParams: { roleName: role.name }
        }
      }
    );

    dialogRef.afterClosed().subscribe((confirmed?: boolean) => {
      if (confirmed) {
        this.updateRoleStatus(role);
      } else {
        this.loadRoles();
      }
    });
  }

  private updateRoleStatus(role: RoleView): void {
    const newStatus = !role.isActive;
    this.updatingIds.update((ids) => new Set(ids).add(role.id));

    const request: UpdateRoleRequest = { isActive: newStatus };

    this.rolesService.updateRole(role.id, request).subscribe({
      next: (response) => {
        this.notifications.success(response.message ?? this.i18nService.translate('ROLES.MESSAGES.UPDATE_SUCCESS'));
        this.updatingIds.update((ids) => {
          const s = new Set(ids);
          s.delete(role.id);
          return s;
        });
        this.loadRoles();
      },
      error: (error) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('ROLES.MESSAGES.UPDATE_ERROR'))
        );
        this.updatingIds.update((ids) => {
          const s = new Set(ids);
          s.delete(role.id);
          return s;
        });
      }
    });
  }

  /**
   * Calls the DELETE endpoint for the selected role.
   *
   * @param role Role to delete.
   */
  private deleteRole(role: RoleView): void {
    this.deletingIds.update((ids) => new Set(ids).add(role.id));

    this.rolesService.deleteRole(role.id).subscribe({
      next: (response) => {
        this.notifications.success(response.message ?? this.i18nService.translate('ROLES.MESSAGES.DELETE_SUCCESS'));
        this.deletingIds.update((ids) => {
          const s = new Set(ids);
          s.delete(role.id);
          return s;
        });
        this.loadRoles();
      },
      error: (error) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('ROLES.MESSAGES.DELETE_ERROR'))
        );
        this.deletingIds.update((ids) => {
          const s = new Set(ids);
          s.delete(role.id);
          return s;
        });
      }
    });
  }
}
