import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Role } from '@core/domain/models/role.model';
import { User } from '@core/domain/models/user.model';
import { RolesService } from '@core/application/roles/roles.service';
import { UsersService } from '@core/application/users/users.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { UserRequest } from '@core/application/dto/user-request.dto';
import { UserFormDialogData, UserFormDialogLabels } from '@shared/interfaces/user-form-dialog.interfaces';
import { generateRandomPassword } from '@shared/utils/password.utils';
import { domainEmail, nonBlank } from '@shared/validators/domain.validators';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';

/**
 * Reactive form model of the user form dialog.
 */
type UserFormModel = {
  userName: FormControl<string>;
  name: FormControl<string>;
  email: FormControl<string>;
  phoneNumber: FormControl<string>;
  roleId: FormControl<string>;
  password: FormControl<string>;
};

/**
 * Reusable dialog that collects the data of a user.
 *
 * <p>Behavior is driven by its input payload so the same component can be
 * opened from any module. In create mode it loads the available roles and
 * creates the user through the create endpoint; in edit mode (when a user is
 * provided) it pre-fills the form and updates the user through the update
 * endpoint. The session token is attached to the request by the
 * authentication interceptor.</p>
 */
@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './user-form-dialog.component.html',
  styleUrls: ['./user-form-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<UserFormDialogComponent>);
  private readonly data = inject<UserFormDialogData>(MAT_DIALOG_DATA);
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly usersService = inject(UsersService);
  private readonly rolesService = inject(RolesService);
  private readonly notifications = inject(NotificationService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly labels: UserFormDialogLabels = this.data.labels;
  readonly generatePassword = this.data.generatePassword;
  readonly showTemporaryPasswordNote = this.data.showTemporaryPasswordNote;
  readonly user: User | null = this.data.user ?? null;
  readonly isEditMode = this.user !== null;

  roles: Role[] = [];
  isLoadingRoles = false;
  isSaving = false;

  readonly form: FormGroup<UserFormModel>;

  private initialUserName = GENERAL_CONSTANTS.EMPTY;
  private initialName = GENERAL_CONSTANTS.EMPTY;
  private initialEmail = GENERAL_CONSTANTS.EMPTY;
  private initialPhoneNumber = GENERAL_CONSTANTS.EMPTY;
  private initialRoleId = GENERAL_CONSTANTS.EMPTY;

  constructor() {
    this.form = this.formBuilder.group({
      userName: this.formBuilder.control(GENERAL_CONSTANTS.EMPTY, {
        validators: [Validators.required, nonBlank()]
      }),
      name: this.formBuilder.control(GENERAL_CONSTANTS.EMPTY, {
        validators: [Validators.required, nonBlank()]
      }),
      email: this.formBuilder.control(GENERAL_CONSTANTS.EMPTY, {
        validators: [Validators.required, domainEmail()]
      }),
      phoneNumber: this.formBuilder.control(GENERAL_CONSTANTS.EMPTY),
      roleId: this.formBuilder.control(GENERAL_CONSTANTS.EMPTY, {
        validators: [Validators.required]
      }),
      password: this.formBuilder.control(GENERAL_CONSTANTS.EMPTY, {
        validators: this.isEditMode ? [] : [Validators.required]
      })
    });

    if (this.user) {
      this.form.patchValue({
        userName: this.user.userName,
        name: this.user.name,
        email: this.user.email,
        phoneNumber: this.user.phoneNumber ?? GENERAL_CONSTANTS.EMPTY,
        roleId: this.user.role?.id ?? GENERAL_CONSTANTS.EMPTY
      });
    } else if (this.generatePassword) {
      this.form.controls.password.setValue(generateRandomPassword());
    }

    const initialValue = this.form.getRawValue();
    this.initialUserName = initialValue.userName;
    this.initialName = initialValue.name;
    this.initialEmail = initialValue.email;
    this.initialPhoneNumber = initialValue.phoneNumber;
    this.initialRoleId = initialValue.roleId;

    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.changeDetectorRef.markForCheck());

    this.loadRoles();
  }

  /**
   * Whether the submit button is disabled.
   *
   * In edit mode the button stays disabled until at least one field changes,
   * so an update is never sent with the original values.
   */
  get isSubmitDisabled(): boolean {
    return this.isSaving || this.isLoadingRoles || this.form.invalid || (this.isEditMode && !this.hasChanges);
  }

  /**
   * Whether the user changed at least one field with respect to the values the
   * dialog was opened with. Only meaningful in edit mode.
   */
  get hasChanges(): boolean {
    const current = this.form.getRawValue();
    return current.userName !== this.initialUserName ||
      current.name !== this.initialName ||
      current.email !== this.initialEmail ||
      current.phoneNumber !== this.initialPhoneNumber ||
      current.roleId !== this.initialRoleId ||
      current.password.length > 0;
  }

  /**
   * Closes the dialog without leaving any data behind.
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Validates the form and triggers the matching save flow.
   */
  submit(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.isEditMode) {
      if (this.hasChanges) {
        this.updateUser();
      }
      return;
    }

    this.createUser();
  }

  /**
   * Loads the roles to populate the role select.
   */
  private loadRoles(): void {
    this.isLoadingRoles = true;

    this.rolesService.getRoles().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.roles = response.data ?? [];
        this.isLoadingRoles = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error: unknown) => {
        this.isLoadingRoles = false;
        this.notifications.error(extractApiErrorMessage(error, this.labels.rolesError));
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  /**
   * Builds the user object from the form data and creates the user.
   */
  private createUser(): void {
    this.isSaving = true;

    const payload: UserRequest = {
      userName: this.form.controls.userName.value.trim(),
      name: this.form.controls.name.value.trim(),
      email: this.form.controls.email.value.trim(),
      phoneNumber: this.form.controls.phoneNumber.value.trim(),
      roleId: this.form.controls.roleId.value,
      password: this.form.controls.password.value
    };

    this.usersService.createUser(payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.notifications.success(this.labels.createdMessage);
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.isSaving = false;
        this.notifications.error(extractApiErrorMessage(error, this.labels.createError));
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  /**
   * Builds the update payload from the form data and updates the user.
   *
   * The password is only included when the user typed a new one; leaving it
   * empty keeps the current password.
   */
  private updateUser(): void {
    const userId = this.user?.id;
    if (!userId) {
      return;
    }

    this.isSaving = true;

    const payload: Partial<UserRequest> = {
      userName: this.form.controls.userName.value.trim(),
      name: this.form.controls.name.value.trim(),
      email: this.form.controls.email.value.trim(),
      phoneNumber: this.form.controls.phoneNumber.value.trim(),
      roleId: this.form.controls.roleId.value
    };

    const password = this.form.controls.password.value;
    if (password) {
      payload.password = password;
    }

    this.usersService.updateUser(userId, payload).subscribe({
      next: () => {
        this.isSaving = false;
        this.notifications.success(this.labels.updatedMessage);
        this.dialogRef.close(true);
      },
      error: (error: unknown) => {
        this.isSaving = false;
        this.notifications.error(extractApiErrorMessage(error, this.labels.updateError));
        this.changeDetectorRef.markForCheck();
      }
    });
  }
}