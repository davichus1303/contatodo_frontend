/**
 * Standard API response interface.
 */
export interface ApiResponse<T> {
  status: number;
  message: string;
  data: T;
}
