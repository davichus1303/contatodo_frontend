import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormGroup, FormArray, FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Module } from '@core/domain/models/module.model';
import { RolePermission } from '@core/domain/models/role.model';
import { RolesService } from '@core/application/roles/roles.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { CreateRoleRequest, RolePermissionPayload, UpdateRoleRequest } from '@core/application/dto/role-request.dto';
import { RoleDialogData, RoleDialogLabels, RoleDialogMode } from '@shared/interfaces/role-dialog.interfaces';
import { nonBlank } from '@shared/validators/domain.validators';

/**
 * Reactive form controls for the permission block of a single module.
 */
interface ModulePermissionForm {
  moduleOid: FormControl<string>;
  create: FormControl<boolean>;
  update: FormControl<boolean>;
  delete: FormControl<boolean>;
  view: FormControl<boolean>;
}

/**
 * Reactive form model of the role dialog.
 */
type RoleFormModel = {
  name: FormControl<string>;
  permissions: FormArray<FormGroup<ModulePermissionForm>>;
};

@Component({
  selector: 'app-role-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './role-dialog.component.html',
  styleUrls: ['./role-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<RoleDialogComponent>);
  private readonly data = inject<RoleDialogData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly rolesService = inject(RolesService);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly mode: RoleDialogMode = this.data.mode;
  readonly labels: RoleDialogLabels = this.data.labels;
  readonly modules = signal<Module[]>([]);
  readonly isLoadingModules = signal<boolean>(false);
  readonly isSaving = signal<boolean>(false);

  readonly form: FormGroup<RoleFormModel>;

  constructor() {
    this.form = this.formBuilder.group({
      name: this.formBuilder.control(this.data.role?.name ?? '', {
        validators: [Validators.required, nonBlank()]
      }),
      permissions: this.formBuilder.array<FormGroup<ModulePermissionForm>>([])
    });
    this.loadModules();
  }

  /**
   * Returns the permission form group for the module at the given index.
   *
   * @param index Module position in the permissions array.
   * @returns Permission form group for the module.
   */
  permissionGroupAt(index: number): FormGroup<ModulePermissionForm> {
    return this.form.controls.permissions.controls[index];
  }

  /**
   * Whether every permission is enabled for the module at the given index.
   *
   * @param index Module position in the permissions array.
   * @returns True when the four permission flags are enabled.
   */
  isAllPermissionsSelected(index: number): boolean {
    const controls = this.permissionGroupAt(index).controls;
    return controls.create.value && controls.update.value && controls.delete.value && controls.view.value;
  }

  /**
   * Toggles every permission of a module at once.
   *
   * @param index Module position in the permissions array.
   * @param checked New value for all permission flags.
   */
  onAllPermissionsChange(index: number, checked: boolean): void {
    const controls = this.permissionGroupAt(index).controls;
    controls.create.setValue(checked);
    controls.update.setValue(checked);
    controls.delete.setValue(checked);
    controls.view.setValue(checked);
  }

  /**
   * Closes the dialog without persisting any change.
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Validates the form and triggers the create/update flow.
   */
  submit(): void {
    if (this.form.invalid || this.isSaving()) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.selectedModuleCount() === 0) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.mode === 'edit') {
      this.updateRole();
      return;
    }
    this.createRole();
  }

  /**
   * Whether the submit button is disabled.
   */
  get isSubmitDisabled(): boolean {
    return this.isSaving() || this.isLoadingModules() || this.form.invalid || this.selectedModuleCount() === 0;
  }

  private loadModules(): void {
    this.isLoadingModules.set(true);

    this.rolesService.getModules().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        const modules = response.data ?? [];
        this.modules.set(modules);
        modules.forEach((module: Module) => {
          this.form.controls.permissions.push(this.buildPermissionGroup(module));
        });
        this.isLoadingModules.set(false);
      },
      error: (error: { error?: unknown }) => {
        this.isLoadingModules.set(false);
        this.notifications.error(extractApiErrorMessage(error, this.labels.modulesError));
      }
    });
  }

  private buildPermissionGroup(module: Module): FormGroup<ModulePermissionForm> {
    const existing = this.findPermission(module.id);
    const flags = existing?.permissions ?? { create: false, update: false, delete: false, view: false };

    return this.formBuilder.group<ModulePermissionForm>({
      moduleOid: this.formBuilder.control(module.id),
      create: this.formBuilder.control(flags.create),
      update: this.formBuilder.control(flags.update),
      delete: this.formBuilder.control(flags.delete),
      view: this.formBuilder.control(flags.view)
    });
  }

  private findPermission(moduleOid: string): RolePermission | undefined {
    return this.data.role?.permissions.find((permission) => permission.moduleOid === moduleOid);
  }

  /**
   * Number of modules with at least one enabled permission.
   *
   * @returns Selected module count.
   */
  selectedModuleCount(): number {
    return this.form.controls.permissions.controls.filter((group) => this.isModuleSelected(group.controls)).length;
  }

  private isModuleSelected(controls: ModulePermissionForm): boolean {
    return controls.create.value || controls.update.value || controls.delete.value || controls.view.value;
  }

  private createRole(): void {
    this.isSaving.set(true);

    const payload: CreateRoleRequest = {
      name: this.form.controls.name.value.trim(),
      permissions: this.buildPermissionsPayload()
    };

    this.rolesService.createRole(payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notifications.success(this.labels.createdMessage);
        this.dialogRef.close(true);
      },
      error: (error: { error?: { message?: string } }) => {
        this.isSaving.set(false);
        this.notifications.error(extractApiErrorMessage(error, this.labels.createError));
      }
    });
  }

  private updateRole(): void {
    const roleId = this.data.role?.id;
    if (!roleId) {
      return;
    }

    this.isSaving.set(true);

    const payload: UpdateRoleRequest = {
      name: this.form.controls.name.value.trim(),
      permissions: this.buildPermissionsPayload()
    };

    this.rolesService.updateRole(roleId, payload).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.notifications.success(this.labels.updatedMessage);
        this.dialogRef.close(true);
      },
      error: (error: { error?: { message?: string } }) => {
        this.isSaving.set(false);
        this.notifications.error(extractApiErrorMessage(error, this.labels.updateError));
      }
    });
  }

  private buildPermissionsPayload(): RolePermissionPayload[] {
    return this.form.controls.permissions.controls
      .filter((group) => this.isModuleSelected(group.controls))
      .map((group) => ({
        moduleOid: group.controls.moduleOid.value,
        permissions: {
          create: group.controls.create.value,
          update: group.controls.update.value,
          delete: group.controls.delete.value,
          view: group.controls.view.value
        }
      }));
  }
}
