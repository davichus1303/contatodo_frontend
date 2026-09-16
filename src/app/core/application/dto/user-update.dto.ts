import { UserRequest } from './user-request.dto';

/**
 * Request payload for updating an existing user.
 *
 * Every user field is optional: an update only carries the changes to apply.
 * It reuses {@link UserRequest} so the update shape stays aligned with the
 * create shape, and adds the fields that are exclusive to updates.
 */
export interface UpdateUserRequest extends Partial<UserRequest> {
  isActive?: boolean;
}
