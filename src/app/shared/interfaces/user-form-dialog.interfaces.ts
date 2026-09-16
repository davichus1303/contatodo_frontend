import { User } from '@core/domain/models/user.model';

/**
 * Resolved dictionary labels used to render the user form dialog.
 *
 * All texts are resolved by the caller from the default dictionary so the
 * dialog can be reused for every context without knowing i18n keys.
 */
export interface UserFormDialogLabels {
  title: string;
  userNameLabel: string;
  userNamePlaceholder: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  roleLabel: string;
  rolePlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  passwordEditPlaceholder: string;
  passwordGeneratedHint: string;
  temporaryPasswordNote: string;
  cancel: string;
  save: string;
  userNameRequired: string;
  fullNameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  roleRequired: string;
  passwordRequired: string;
  rolesError: string;
  createdMessage: string;
  createError: string;
  updatedMessage: string;
  updateError: string;
}

/**
 * Input payload for the user form dialog.
 *
 * The dialog is reusable: behavior is driven by the flags so the same
 * component can be opened from any module. When opened from the users module
 * a random password is suggested and the temporary password note is shown.
 */
export interface UserFormDialogData {
  /**
   * When true the password field is pre-filled with a random password and a
   * hint explains it was generated automatically.
   */
  generatePassword: boolean;
  /**
   * When true the note "the password is temporary" is displayed.
   */
  showTemporaryPasswordNote: boolean;
  /**
   * User to edit. When present the dialog opens in edit mode: the form is
   * pre-filled with the given user and the password becomes optional.
   */
  user?: User | null;
  labels: UserFormDialogLabels;
}