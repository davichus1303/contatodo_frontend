/**
 * Request payload for creating a new user.
 */
export interface CreateUserRequest {
  userName: string;
  name: string;
  email: string;
  roleId: string;
  password: string;
}