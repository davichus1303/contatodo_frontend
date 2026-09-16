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
import { RolesService } from '@core/application/roles/roles.service';
import { UsersService } from '@core/application/users/users.service';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { UserRequest } from '@core/application/dto/user-request.dto';
import { UserFormDialogData, UserFormDialogLabels } from '@shared/interfaces/user-form-dialog.interfaces';
import { generateRandomPassword } from '@shared/utils/password.utils';
import { domainEmail, nonBlank } from '@shared/validators/domain.validators';

/**
 * Reactive form model of the user form dialog.
 */
type UserFormModel = {
  userName: FormControl<string>;
  name: FormControl<string>;
  email: FormControl<string>;
  roleId: FormControl<string>;
  password: FormControl<string>;
};

/**
 * Reusable dialog that collects the data of a new user.
 *
 * <p>Behavior is driven by its input payload so the same component can be
 * opened from any module: it loads the available roles, builds the request
 * object and creates the user through the create endpoint. The session token
 * is attached to the request by the authentication interceptor.</p>
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

  roles: Role[] = [];
  isLoadingRoles = false;
  isSaving = false;

  readonly form: FormGroup<UserFormModel>;

  constructor() {
    this.form = this.formBuilder.group({
      userName: this.formBuilder.control('', {
        validators: [Validators.required, nonBlank()]
      }),
      name: this.formBuilder.control('', {
        validators: [Validators.required, nonBlank()]
      }),
      email: this.formBuilder.control('', {
        validators: [Validators.required, domainEmail()]
      }),
      roleId: this.formBuilder.control('', {
        validators: [Validators.required]
      }),
      password: this.formBuilder.control('', {
        validators: [Validators.required]
      })
    });

    if (this.generatePassword) {
      this.form.controls.password.setValue(generateRandomPassword());
    }

    this.loadRoles();
  }

  /**
   * Whether the submit button is disabled.
   */
  get isSubmitDisabled(): boolean {
    return this.isSaving || this.isLoadingRoles || this.form.invalid;
  }

  /**
   * Closes the dialog without leaving any data behind.
   */
  cancel(): void {
    this.dialogRef.close();
  }

  /**
   * Validates the form and triggers the user creation flow.
   */
  submit(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
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
}