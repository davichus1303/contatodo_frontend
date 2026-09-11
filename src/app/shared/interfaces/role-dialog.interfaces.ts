import { Role } from '@core/domain/models/role.model';

/**
 * Creation or edition mode of the role dialog.
 */
export type RoleDialogMode = 'create' | 'edit';

/**
 * Resolved dictionary labels for each role permission checkbox.
 */
export interface RoleDialogPermissionLabels {
  create: string;
  update: string;
  delete: string;
  view: string;
}

/**
 * Resolved dictionary labels used to render the role dialog.
 *
 * All texts are resolved by the caller from the default dictionary so the
 * dialog can be reused for every entity without knowing i18n keys.
 */
export interface RoleDialogLabels {
  title: string;
  nameLabel: string;
  namePlaceholder: string;
  permissionsSectionLabel: string;
  allPermissionsLabel: string;
  permissionLabels: RoleDialogPermissionLabels;
  cancel: string;
  save: string;
  nameRequired: string;
  permissionsRequired: string;
  modulesError: string;
  createdMessage: string;
  createError: string;
  updatedMessage: string;
  updateError: string;
}

/**
 * Input payload for the role dialog.
 */
export interface RoleDialogData {
  mode: RoleDialogMode;
  role?: Role;
  labels: RoleDialogLabels;
}
