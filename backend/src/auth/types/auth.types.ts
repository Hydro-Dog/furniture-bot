export interface AccessTokenPayload {
  sub: string;
  username: string;
  roles: string[];
  csrfToken: string;
  refreshSessionId: string;
}

export interface AuthUser {
  id: string;
  username: string;
  roles: string[];
  csrfToken: string;
  refreshSessionId: string;
}
