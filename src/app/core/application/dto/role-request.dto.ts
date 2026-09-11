/**
 * Transport payload for the permissions a role holds over a module.
 */
export interface RolePermissionPayload {
  moduleOid: string;
  permissions: {
    create: boolean;
    update: boolean;
    delete: boolean;
    view: boolean;
  };
}

/**
 * Request payload for creating a role.
 */
export interface CreateRoleRequest {
  name: string;
  permissions: RolePermissionPayload[];
}

/**
 * Request payload for updating an existing role.
 */
export interface UpdateRoleRequest {
  name?: string;
  permissions?: RolePermissionPayload[];
  isActive?: boolean;
}
