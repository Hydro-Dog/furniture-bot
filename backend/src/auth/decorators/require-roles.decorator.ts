import { SetMetadata } from '@nestjs/common';
import { AUTH_ROLES_KEY } from '../constants/auth.constants';

export const RequireRoles = (...roles: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(AUTH_ROLES_KEY, roles);
