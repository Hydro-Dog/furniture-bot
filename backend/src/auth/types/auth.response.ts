export interface AuthUserResponse {
  id: string;
  username: string;
  roles: string[];
}

export interface AuthSuccessResponse {
  user: AuthUserResponse;
  csrfToken: string;
}
