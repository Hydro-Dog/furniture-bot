import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RateLimit } from '../rate-limit/decorators/rate-limit.decorator';
import {
  DEFAULT_LOGIN_RATE_LIMIT,
  LOGIN_RATE_LIMIT_SCOPE
} from '../rate-limit/constants/rate-limit.constants';
import { AuthService } from './auth.service';
import { ADMIN_ROLE, REFRESH_COOKIE_NAME } from './constants/auth.constants';
import { Public } from './decorators/public.decorator';
import { RequireRoles } from './decorators/require-roles.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthSuccessResponse } from './types/auth.response';
import { AuthUser } from './types/auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @RateLimit({
    ...DEFAULT_LOGIN_RATE_LIMIT,
    keyMode: 'ip_username',
    scope: LOGIN_RATE_LIMIT_SCOPE
  })
  @Post('login')
  @HttpCode(200)
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthSuccessResponse> {
    return this.authService.login({
      dto,
      response: res,
      ip: req.ip || '',
      userAgent: req.header('user-agent') || ''
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<AuthSuccessResponse> {
    return this.authService.refresh({
      response: res,
      refreshToken: req.cookies?.[REFRESH_COOKIE_NAME],
      csrfTokenHeader: req.header('x-csrf-token'),
      ip: req.ip || '',
      userAgent: req.header('user-agent') || ''
    });
  }

  @Post('logout')
  @RequireRoles(ADMIN_ROLE)
  @HttpCode(204)
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<void> {
    return this.authService.logout({
      response: res,
      refreshToken: req.cookies?.[REFRESH_COOKIE_NAME]
    });
  }

  @Get('me')
  @RequireRoles(ADMIN_ROLE)
  me(@Req() req: Request & { user?: AuthUser }): Promise<AuthSuccessResponse> {
    if (!req.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.authService.getMe(req.user);
  }
}
