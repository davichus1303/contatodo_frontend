import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule, MatSlideToggleChange } from '@angular/material/slide-toggle';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NotificationService } from '@core/application/notifications/notification.service';
import { extractApiErrorMessage } from '@core/application/ports/api-error';
import { UsersService } from '@core/application/users/users.service';
import { User } from '@core/domain/models/user.model';
import { ApiResponse } from '@core/application/ports/api-response.interface';
import { UserRequest } from '@core/application/dto/user-request.dto';
import { I18nService } from '@core/i18n/i18n.service';
import { openConfirmationDialog } from '@shared/utils/dialog.utils';
import { addPendingId, removePendingId } from '@shared/utils/pending-ids.utils';
import { filterBySearchTerm, normalizeSearchTerm } from '@shared/utils/search.utils';
import { displayOrFallback } from '@shared/utils/display.utils';
import { UserFormDialogComponent } from '@shared/components/user-form-dialog/user-form-dialog.component';
import { UserFormDialogData, UserFormDialogLabels } from '@shared/interfaces/user-form-dialog.interfaces';
import { PermissionDirective } from '@shared/directives/permission.directive';

/**
 * Users catalog page.
 *
 * Lists active users with their related role and offers create, edit, delete
 * and status actions. Create opens a reusable user form dialog and reloads the
 * catalog when a user is created. Edit opens the same dialog pre-filled and
 * reloads the catalog when a user is updated. Delete asks for confirmation and
 * removes the user through the delete endpoint. The status toggle updates the
 * user through the update endpoint.
 */
@Component({
  selector: 'app-users',
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
    PermissionDirective
  ],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent {
  private readonly usersService = inject(UsersService);
  private readonly notifications = inject(NotificationService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  readonly i18nService = inject(I18nService);

  readonly searchControl = new FormControl<string>('');

  users: User[] = [];
  searchTerm = '';
  isLoading = false;
  updatingIds = new Set<string>();

  constructor() {
    this.searchControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value: string | null) => {
        this.searchTerm = normalizeSearchTerm(value);
        this.changeDetectorRef.markForCheck();
      });
    this.loadUsers();
  }

  /**
   * Users matching the current search term.
   *
   * Matching is a partial, case-insensitive `contains` over the user name,
   * email, username and role name. Users without a resolved role never match
   * on the role criterion.
   */
  get filteredUsers(): User[] {
    return filterBySearchTerm(this.users, this.searchTerm, (user: User) => [
      user.name,
      user.email,
      user.userName,
      user.role?.name
    ]);
  }

  /**
   * Resolves the role name shown on a user card.
   *
   * @param user User whose role must be displayed.
   * @returns The role name, or the localized placeholder when it has no role.
   */
  getRoleName(user: User): string {
    return displayOrFallback(user.role?.name, this.i18nService.translate('USERS.NO_ROLE'));
  }

  /**
   * Resolves the phone number shown on a user card.
   *
   * @param user User whose phone number must be displayed.
   * @returns The phone number, or the localized placeholder when it is empty.
   */
  getPhoneNumber(user: User): string {
    return displayOrFallback(user.phoneNumber, this.i18nService.translate('USERS.NO_PHONE'));
  }

  /**
   * Loads the users catalog from the backend.
   */
  loadUsers(): void {
    if (this.isLoading) {
      return;
    }

    this.isLoading = true;

    this.usersService.getUsers().subscribe({
      next: (response: ApiResponse<User[]>) => {
        this.users = response.data ?? [];
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      },
      error: (error: unknown) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('USERS.MESSAGES.ERROR_LOADING'))
        );
        this.isLoading = false;
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  /**
   * Opens the reusable user form dialog in create mode.
   *
   * Opened from the users module it suggests a random password and shows the
   * temporary password note. If the dialog confirms, the catalog is reloaded.
   */
  openCreateDialog(): void {
    const dialogRef = this.dialog.open<UserFormDialogComponent, UserFormDialogData, boolean>(
      UserFormDialogComponent,
      {
        width: '560px',
        data: {
          generatePassword: true,
          showTemporaryPasswordNote: true,
          labels: this.buildUserFormDialogLabels(this.i18nService.translate('USERS.MODAL.CREATE_TITLE'))
        }
      }
    );

    dialogRef.afterClosed().subscribe((created?: boolean) => {
      if (created) {
        this.loadUsers();
      }
    });
  }

  /**
   * Resolves the dialog labels from the dictionary.
   *
   * @param title Dialog title.
   * @returns Resolved labels for the user form dialog.
   */
  private buildUserFormDialogLabels(title: string): UserFormDialogLabels {
    return {
      title,
      userNameLabel: this.i18nService.translate('USERS.MODAL.USERNAME_LABEL'),
      userNamePlaceholder: this.i18nService.translate('USERS.MODAL.USERNAME_PLACEHOLDER'),
      fullNameLabel: this.i18nService.translate('USERS.MODAL.FULL_NAME_LABEL'),
      fullNamePlaceholder: this.i18nService.translate('USERS.MODAL.FULL_NAME_PLACEHOLDER'),
      emailLabel: this.i18nService.translate('USERS.MODAL.EMAIL_LABEL'),
      emailPlaceholder: this.i18nService.translate('USERS.MODAL.EMAIL_PLACEHOLDER'),
      phoneLabel: this.i18nService.translate('USERS.MODAL.PHONE_LABEL'),
      phonePlaceholder: this.i18nService.translate('USERS.MODAL.PHONE_PLACEHOLDER'),
      roleLabel: this.i18nService.translate('USERS.MODAL.ROLE_LABEL'),
      rolePlaceholder: this.i18nService.translate('USERS.MODAL.ROLE_PLACEHOLDER'),
      companyLabel: this.i18nService.translate('USERS.MODAL.COMPANY_LABEL'),
      companyPlaceholder: this.i18nService.translate('USERS.MODAL.COMPANY_PLACEHOLDER'),
      passwordLabel: this.i18nService.translate('USERS.MODAL.PASSWORD_LABEL'),
      passwordPlaceholder: this.i18nService.translate('USERS.MODAL.PASSWORD_PLACEHOLDER'),
      passwordEditPlaceholder: this.i18nService.translate('USERS.MODAL.PASSWORD_EDIT_PLACEHOLDER'),
      passwordGeneratedHint: this.i18nService.translate('USERS.MODAL.PASSWORD_GENERATED_HINT'),
      temporaryPasswordNote: this.i18nService.translate('USERS.MODAL.TEMPORARY_PASSWORD_NOTE'),
      cancel: this.i18nService.translate('USERS.MODAL.CANCEL'),
      save: this.i18nService.translate('USERS.MODAL.SAVE'),
      userNameRequired: this.i18nService.translate('USERS.MODAL.USERNAME_REQUIRED'),
      fullNameRequired: this.i18nService.translate('USERS.MODAL.FULL_NAME_REQUIRED'),
      emailRequired: this.i18nService.translate('USERS.MODAL.EMAIL_REQUIRED'),
      emailInvalid: this.i18nService.translate('USERS.MODAL.EMAIL_INVALID'),
      roleRequired: this.i18nService.translate('USERS.MODAL.ROLE_REQUIRED'),
      passwordRequired: this.i18nService.translate('USERS.MODAL.PASSWORD_REQUIRED'),
      rolesError: this.i18nService.translate('USERS.MESSAGES.ERROR_LOADING_ROLES'),
      createdMessage: this.i18nService.translate('USERS.MESSAGES.CREATED'),
      createError: this.i18nService.translate('USERS.MESSAGES.ERROR_CREATING'),
      updatedMessage: this.i18nService.translate('USERS.MESSAGES.UPDATE_SUCCESS'),
      updateError: this.i18nService.translate('USERS.MESSAGES.UPDATE_ERROR')
    };
  }

  /**
   * Opens the reusable user form dialog in edit mode for the given user.
   *
   * The form is pre-filled and the dialog only confirms once at least one
   * field changes. If the dialog confirms, the catalog is reloaded.
   *
   * @param user User selected for edition.
   */
  openEditDialog(user: User): void {
    const dialogRef = this.dialog.open<UserFormDialogComponent, UserFormDialogData, boolean>(
      UserFormDialogComponent,
      {
        width: '560px',
        data: {
          generatePassword: false,
          showTemporaryPasswordNote: false,
          user,
          labels: this.buildUserFormDialogLabels(this.i18nService.translate('USERS.MODAL.EDIT_TITLE'))
        }
      }
    );

    dialogRef.afterClosed().subscribe((updated?: boolean) => {
      if (updated) {
        this.loadUsers();
      }
    });
  }

  /**
   * Opens the delete confirmation dialog for a user.
   *
   * The warning states the user will be permanently removed. Only a confirmed
   * dialog sends the deletion; cancelling leaves the catalog untouched.
   *
   * @param user User selected for deletion.
   */
  onDelete(user: User): void {
    const dialogRef = openConfirmationDialog(
      this.dialog,
      {
        titleKey: 'USERS.CONFIRM_DELETE_TITLE',
        messageKey: 'USERS.CONFIRM_DELETE_MESSAGE',
        cancelKey: 'USERS.CANCEL',
        confirmKey: 'USERS.DELETE',
        messageParams: { email: user.email }
      },
      '420px'
    );

    dialogRef.afterClosed().subscribe((confirmed?: boolean) => {
      if (confirmed) {
        this.deleteUser(user);
      }
    });
  }

  /**
   * Sends the deletion of a user through the delete endpoint.
   *
   * Only the user identifier is sent, as the endpoint does not need a body.
   *
   * @param user User to delete.
   */
  private deleteUser(user: User): void {
    this.updatingIds = addPendingId(this.updatingIds, user.id);
    this.changeDetectorRef.markForCheck();

    this.usersService.deleteUser(user.id).subscribe({
      next: () => {
        this.notifications.success(this.i18nService.translate('USERS.MESSAGES.DELETE_SUCCESS'));
        this.updatingIds = removePendingId(this.updatingIds, user.id);
        this.loadUsers();
      },
      error: (error: unknown) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('USERS.MESSAGES.DELETE_ERROR'))
        );
        this.updatingIds = removePendingId(this.updatingIds, user.id);
        this.changeDetectorRef.markForCheck();
      }
    });
  }

  /**
   * Checks whether the status update for a user is pending.
   *
   * @param id User identifier.
   * @returns True when the update request is in flight.
   */
  isUpdating(id: string): boolean {
    return this.updatingIds.has(id);
  }

  /**
   * Open the status warning dialog when a user toggle changes.
   *
   * Moving the toggle to inactive warns that the user will no longer be able
   * to use the system; moving it to active warns the opposite. Only a confirmed
   * dialog sends the update; cancelling reloads the catalog to revert the
   * toggle.
   *
   * @param user User whose status changed.
   * @param event Slide toggle change event.
   */
  onToggleChange(user: User, event: MatSlideToggleChange): void {
    const activating = event.checked;

    const dialogRef = openConfirmationDialog(
      this.dialog,
      {
        titleKey: activating ? 'USERS.CONFIRM_ACTIVATE_TITLE' : 'USERS.CONFIRM_DEACTIVATE_TITLE',
        messageKey: activating ? 'USERS.CONFIRM_ACTIVATE_MESSAGE' : 'USERS.CONFIRM_DEACTIVATE_MESSAGE',
        cancelKey: 'USERS.CANCEL',
        confirmKey: activating ? 'USERS.ACTIVATE' : 'USERS.DEACTIVATE'
      },
      '420px'
    );

    dialogRef.afterClosed().subscribe((confirmed?: boolean) => {
      if (confirmed) {
        this.updateUserStatus(user);
      } else {
        this.loadUsers();
      }
    });
  }

  /**
   * Sends the new status of a user through the update endpoint.
   *
   * @param user User whose status must be updated.
   */
  private updateUserStatus(user: User): void {
    const newStatus = !user.active;
    this.updatingIds = addPendingId(this.updatingIds, user.id);
    this.changeDetectorRef.markForCheck();

    const request: Partial<UserRequest> = { isActive: newStatus };

    this.usersService.updateUser(user.id, request).subscribe({
      next: () => {
        this.notifications.success(this.i18nService.translate('USERS.MESSAGES.UPDATE_SUCCESS'));
        this.updatingIds = removePendingId(this.updatingIds, user.id);
        this.loadUsers();
      },
      error: (error: unknown) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('USERS.MESSAGES.UPDATE_ERROR'))
        );
        this.updatingIds = removePendingId(this.updatingIds, user.id);
        this.changeDetectorRef.markForCheck();
      }
    });
  }
}
