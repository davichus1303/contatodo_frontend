/**
 * User data transport payload.
 *
 * Generic means of transport for the data of a user, reusable by any feature
 * that needs to create or reference a user (for example the users module or a
 * registration flow) without declaring an own user-shaped interface.
 */
export interface UserRequest {
  userName: string;
  name: string;
  email: string;
  roleId: string;
  password: string;
}