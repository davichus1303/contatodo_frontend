/**
 * User data transport payload.
 *
 * Generic means of transport for the data of a user, reusable by any feature
 * that needs to create, update or reference a user (for example the users
 * module or a registration flow) without declaring an own user-shaped
 * interface. Updates use {@link Partial} of this type so a request only
 * carries the fields to change.
 */
export interface UserRequest {
  userName: string;
  name: string;
  email: string;
  phoneNumber?: string;
  roleId: string;
  password: string;
  isActive?: boolean;
}