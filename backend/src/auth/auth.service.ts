import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Response } from 'express';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import {
  ADMIN_ROLE,
  DEFAULT_ACCESS_TTL_SECONDS,
  DEFAULT_REFRESH_TTL_SECONDS
} from './constants/auth.constants';
import { LoginDto } from './dto/login.dto';
import { AuthSuccessResponse, AuthUserResponse } from './types/auth.response';
import { AuthUser } from './types/auth.types';
import { clearAuthCookies, setAccessCookie, setCsrfCookie, setRefreshCookie } from './utils/cookie';
import { generateOpaqueToken, hashToken } from './utils/crypto';
import { signAccessToken } from './utils/jwt';
import { verifyPassword } from './utils/password';

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  is_active: boolean;
}

interface UserRolesRow {
  roles: string[] | null;
}

interface RefreshSessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  family_id: string;
  csrf_token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
}

@Injectable()
export class AuthService {
  constructor(private readonly sequelize: Sequelize) {}

  async login(params: {
    dto: LoginDto;
    response: Response;
    ip: string;
    userAgent: string;
  }): Promise<AuthSuccessResponse> {
    const username = this.normalizeUsername(params.dto.username);
    const user = await this.getUserByUsername(username);
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await verifyPassword(user.password_hash, params.dto.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const roles = await this.getUserRoles(user.id);
    if (!roles.includes(ADMIN_ROLE)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createAuthSessionResponse({
      user,
      roles,
      response: params.response,
      ip: params.ip,
      userAgent: params.userAgent
    });
  }

  async refresh(params: {
    response: Response;
    refreshToken: string | undefined;
    csrfTokenHeader: string | undefined;
    ip: string;
    userAgent: string;
  }): Promise<AuthSuccessResponse> {
    if (!params.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const session = await this.getRefreshSessionByTokenHash(hashToken(params.refreshToken));
    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revoked_at || this.toDate(session.expires_at).getTime() <= Date.now()) {
      await this.revokeFamily(session.family_id);
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!params.csrfTokenHeader || hashToken(params.csrfTokenHeader) !== session.csrf_token_hash) {
      throw new UnauthorizedException('Invalid CSRF token');
    }

    const user = await this.getUserById(session.user_id);
    if (!user || !user.is_active) {
      throw new UnauthorizedException('User is inactive');
    }

    const roles = await this.getUserRoles(user.id);
    await this.revokeRefreshSession(session.id);

    const nextRefreshToken = generateOpaqueToken();
    const nextCsrfToken = generateOpaqueToken(24);
    const nextSessionId = randomUUID();

    await this.insertRefreshSession({
      id: nextSessionId,
      userId: user.id,
      tokenHash: hashToken(nextRefreshToken),
      familyId: session.family_id,
      rotatedFromId: session.id,
      csrfTokenHash: hashToken(nextCsrfToken),
      expiresAt: new Date(Date.now() + this.refreshTtlMs()),
      ip: params.ip,
      userAgent: params.userAgent
    });

    this.setAuthCookies(params.response, {
      user,
      roles,
      refreshToken: nextRefreshToken,
      csrfToken: nextCsrfToken,
      refreshSessionId: nextSessionId
    });

    return {
      user: this.mapUser(user, roles),
      csrfToken: nextCsrfToken
    };
  }

  async logout(params: {
    response: Response;
    refreshToken: string | undefined;
  }): Promise<void> {
    if (params.refreshToken) {
      const session = await this.getRefreshSessionByTokenHash(hashToken(params.refreshToken));
      if (session) {
        await this.revokeFamily(session.family_id);
      }
    }

    clearAuthCookies(params.response);
  }

  async getMe(user: AuthUser): Promise<AuthSuccessResponse> {
    const freshUser = await this.getUserById(user.id);
    if (!freshUser || !freshUser.is_active) {
      throw new UnauthorizedException('User is inactive');
    }

    const roles = await this.getUserRoles(freshUser.id);
    return {
      user: this.mapUser(freshUser, roles),
      csrfToken: user.csrfToken
    };
  }

  private async createAuthSessionResponse(params: {
    user: UserRow;
    roles: string[];
    response: Response;
    ip: string;
    userAgent: string;
  }): Promise<AuthSuccessResponse> {
    const csrfToken = generateOpaqueToken(24);
    const refreshToken = generateOpaqueToken();
    const refreshSessionId = randomUUID();

    await this.insertRefreshSession({
      id: refreshSessionId,
      userId: params.user.id,
      tokenHash: hashToken(refreshToken),
      familyId: randomUUID(),
      rotatedFromId: null,
      csrfTokenHash: hashToken(csrfToken),
      expiresAt: new Date(Date.now() + this.refreshTtlMs()),
      ip: params.ip,
      userAgent: params.userAgent
    });

    this.setAuthCookies(params.response, {
      user: params.user,
      roles: params.roles,
      refreshToken,
      csrfToken,
      refreshSessionId
    });

    return {
      user: this.mapUser(params.user, params.roles),
      csrfToken
    };
  }

  private setAuthCookies(
    response: Response,
    params: {
      user: UserRow;
      roles: string[];
      refreshToken: string;
      csrfToken: string;
      refreshSessionId: string;
    }
  ): void {
    const accessToken = signAccessToken(
      {
        sub: params.user.id,
        username: params.user.username,
        roles: params.roles,
        csrfToken: params.csrfToken,
        refreshSessionId: params.refreshSessionId
      },
      this.accessTtlSeconds()
    );

    setAccessCookie(response, accessToken, this.accessTtlSeconds());
    setRefreshCookie(response, params.refreshToken, this.refreshTtlSeconds());
    setCsrfCookie(response, params.csrfToken, this.refreshTtlSeconds());
  }

  private async getUserByUsername(username: string): Promise<UserRow | null> {
    const rows = await this.sequelize.query<UserRow>(
      `
      SELECT id, username, password_hash, is_active
      FROM users
      WHERE lower(username) = :username
      LIMIT 1
      `,
      {
        replacements: { username },
        type: QueryTypes.SELECT
      }
    );

    return rows[0] ?? null;
  }

  private async getUserById(id: string): Promise<UserRow | null> {
    const rows = await this.sequelize.query<UserRow>(
      `
      SELECT id, username, password_hash, is_active
      FROM users
      WHERE id = :id
      LIMIT 1
      `,
      {
        replacements: { id },
        type: QueryTypes.SELECT
      }
    );

    return rows[0] ?? null;
  }

  private async getUserRoles(userId: string): Promise<string[]> {
    const rows = await this.sequelize.query<UserRolesRow>(
      `
      SELECT array_agg(r.code ORDER BY r.code) AS roles
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = :userId
      `,
      {
        replacements: { userId },
        type: QueryTypes.SELECT
      }
    );

    return rows[0]?.roles ?? [];
  }

  private async insertRefreshSession(params: {
    id: string;
    userId: string;
    tokenHash: string;
    familyId: string;
    rotatedFromId: string | null;
    csrfTokenHash: string;
    expiresAt: Date;
    ip: string;
    userAgent: string;
  }): Promise<void> {
    await this.sequelize.query(
      `
      INSERT INTO refresh_sessions (
        id,
        user_id,
        token_hash,
        family_id,
        rotated_from_id,
        csrf_token_hash,
        expires_at,
        user_agent,
        ip
      )
      VALUES (
        :id,
        :userId,
        :tokenHash,
        :familyId,
        :rotatedFromId,
        :csrfTokenHash,
        :expiresAt,
        :userAgent,
        :ip
      )
      `,
      {
        replacements: {
          id: params.id,
          userId: params.userId,
          tokenHash: params.tokenHash,
          familyId: params.familyId,
          rotatedFromId: params.rotatedFromId,
          csrfTokenHash: params.csrfTokenHash,
          expiresAt: params.expiresAt.toISOString(),
          userAgent: params.userAgent || null,
          ip: params.ip || null
        },
        type: QueryTypes.INSERT
      }
    );
  }

  private async getRefreshSessionByTokenHash(tokenHash: string): Promise<RefreshSessionRow | null> {
    const rows = await this.sequelize.query<RefreshSessionRow>(
      `
      SELECT id, user_id, token_hash, family_id, csrf_token_hash, expires_at, revoked_at
      FROM refresh_sessions
      WHERE token_hash = :tokenHash
      LIMIT 1
      `,
      {
        replacements: { tokenHash },
        type: QueryTypes.SELECT
      }
    );

    return rows[0] ?? null;
  }

  private async revokeRefreshSession(id: string): Promise<void> {
    await this.sequelize.query(
      `
      UPDATE refresh_sessions
      SET revoked_at = COALESCE(revoked_at, now()), last_used_at = now()
      WHERE id = :id
      `,
      {
        replacements: { id },
        type: QueryTypes.UPDATE
      }
    );
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.sequelize.query(
      `
      UPDATE refresh_sessions
      SET revoked_at = COALESCE(revoked_at, now())
      WHERE family_id = :familyId
      `,
      {
        replacements: { familyId },
        type: QueryTypes.UPDATE
      }
    );
  }

  private accessTtlSeconds(): number {
    return Number(process.env.AUTH_ACCESS_TTL_SECONDS || DEFAULT_ACCESS_TTL_SECONDS);
  }

  private refreshTtlSeconds(): number {
    return Number(process.env.AUTH_REFRESH_TTL_SECONDS || DEFAULT_REFRESH_TTL_SECONDS);
  }

  private refreshTtlMs(): number {
    return this.refreshTtlSeconds() * 1000;
  }

  private normalizeUsername(value: string): string {
    return value.trim().toLowerCase();
  }

  private toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private mapUser(user: UserRow, roles: string[]): AuthUserResponse {
    return {
      id: user.id,
      username: user.username,
      roles
    };
  }
}
