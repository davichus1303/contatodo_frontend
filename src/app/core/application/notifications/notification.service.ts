import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GENERAL_CONSTANTS } from '@shared/constants/general.constants';

/**
 * Application-wide user notifications.
 *
 * Centralizes the snackbar configuration (close button label and duration)
 * that was previously repeated on every `snackBar.open` call site.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly snackBar = inject(MatSnackBar);

  /**
   * Shows a success notification.
   *
   * @param message Translated message to display.
   */
  success(message: string): void {
    this.show(message);
  }

  /**
   * Shows an error notification.
   *
   * @param message Translated message to display.
   */
  error(message: string): void {
    this.show(message);
  }

  /**
   * Opens the snackbar with the shared default configuration.
   */
  private show(message: string): void {
    this.snackBar.open(
      message,
      GENERAL_CONSTANTS.SNACKBAR.CLOSE_BUTTON,
      { duration: GENERAL_CONSTANTS.SNACKBAR.DURATION }
    );
  }
}
