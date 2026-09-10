import { RolePermission } from '../../domain/models/role.model';

export interface UpdateRoleRequest {
  name?: string;
  permissions?: RolePermission[];
  isActive?: boolean;
}