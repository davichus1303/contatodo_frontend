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
import { UpdateUserRequest } from '@core/application/dto/user-update.dto';
import { I18nService } from '@core/i18n/i18n.service';
import { openConfirmationDialog } from '@shared/utils/dialog.utils';
import { addPendingId, removePendingId } from '@shared/utils/pending-ids.utils';

/**
 * Users catalog page.
 *
 * Lists active users with their related role and offers edit, delete and
 * status actions. Edit and delete are rendered but disabled: this view only
 * prepares them for a later implementation. The status toggle is functional
 * and updates the user through the update endpoint.
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
    MatSlideToggleModule
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
        this.searchTerm = value?.trim().toLowerCase() ?? '';
        this.changeDetectorRef.markForCheck();
      });
    this.loadUsers();
  }

  /**
   * Users matching the current search term.
   *
   * Matching is a partial, case-insensitive `contains` over the user name,
   * email and username.
   */
  get filteredUsers(): User[] {
    if (!this.searchTerm) {
      return this.users;
    }

    return this.users.filter((user: User) =>
      user.name.toLowerCase().includes(this.searchTerm) ||
      user.email.toLowerCase().includes(this.searchTerm) ||
      user.userName.toLowerCase().includes(this.searchTerm)
    );
  }

  /**
   * Resolves the role name shown on a user card.
   *
   * @param user User whose role must be displayed.
   * @returns The role name, or the localized placeholder when it has no role.
   */
  getRoleName(user: User): string {
    return user.role?.name ?? this.i18nService.translate('USERS.NO_ROLE');
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
   * Placeholder for the edit-user dialog, prepared for a later implementation.
   *
   * @param user User selected for edition.
   */
  openEditDialog(user: User): void {
  }

  /**
   * Placeholder for the delete-user flow, prepared for a later implementation.
   *
   * @param user User selected for deletion.
   */
  onDelete(user: User): void {
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

    const request: UpdateUserRequest = { isActive: newStatus };

    this.usersService.updateUser(user.id, request).subscribe({
      next: () => {
        this.notifications.success(this.i18nService.translate('USERS.UPDATE_SUCCESS'));
        this.updatingIds = removePendingId(this.updatingIds, user.id);
        this.loadUsers();
      },
      error: (error: unknown) => {
        this.notifications.error(
          extractApiErrorMessage(error, this.i18nService.translate('USERS.UPDATE_ERROR'))
        );
        this.updatingIds = removePendingId(this.updatingIds, user.id);
        this.changeDetectorRef.markForCheck();
      }
    });
  }
}
