/**
 * DTO for login response.
 */
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    userName: string;
    email: string;
    name: string;
    createdDate: string;
    updatedDate: string;
    active: boolean;
  };
}
