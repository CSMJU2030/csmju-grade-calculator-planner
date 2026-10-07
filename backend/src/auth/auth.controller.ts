import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import {
  SUBSYSTEM_BLOCKED_NEXT,
  safeNextPath,
} from './next-path';
import { ROLE_PERMISSIONS } from './permissions';
import { CORE_ROLE_TO_SUBSYSTEM_ROLE } from './role-mapping';
import {
  SSO_STATE_COOKIE_PATH,
  SSO_STATE_TTL_SEC,
  buildCookieRemoval,
  buildSsoCookie,
  buildSsoStateCookie,
  createSsoState,
  readSsoState,
  ssoCookieNames,
  timingSafeEqualString,
} from './sso-session';

const SIGN_IN_AGAIN_PAGE = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>เข้าสู่ระบบไม่สำเร็จ</title>
</head>
<body>
<h1>เข้าสู่ระบบไม่สำเร็จ</h1>
<p>การเข้าสู่ระบบหมดเวลาหรือไม่ตรงกับเบราว์เซอร์นี้</p>
<p><a href="/auth/login">เข้าสู่ระบบอีกครั้ง</a></p>
</body>
</html>`;

@Controller()
export class AuthController {
  private readonly subsystemId: string;
  private readonly names: { session: string; state: string };

  constructor(private readonly authService: AuthService) {
    const subsystemId = process.env.SUBSYSTEM_ID?.trim();

    if (!subsystemId) {
      throw new Error('SUBSYSTEM_ID is required');
    }

    this.subsystemId = subsystemId;
    this.names = ssoCookieNames(subsystemId);
  }

  private get secure(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private get coreHubWebUrl(): string {
    const value = process.env.CORE_HUB_WEB_URL?.trim();

    if (!value) {
      throw new Error('CORE_HUB_WEB_URL is required');
    }

    const url = new URL(value);

    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid CORE_HUB_WEB_URL protocol');
    }

    return url.toString().replace(/\/+$/, '');
  }

  @Get('auth/login')
  @Header('Cache-Control', 'no-store')
  login(
    @Query('next') next: unknown,
    @Res() response: Response,
  ): void {
    const state = createSsoState();
    const landing =
      safeNextPath(next, SUBSYSTEM_BLOCKED_NEXT) ?? '/';

    const target = new URL(
      `${this.coreHubWebUrl}/sso/authorize`,
    );

    target.searchParams.set('subsystem', this.subsystemId);
    target.searchParams.set('state', state);

    response.setHeader(
      'Set-Cookie',
      buildSsoStateCookie(
        this.names.state,
        state,
        landing,
        SSO_STATE_TTL_SEC,
        this.secure,
      ),
    );

    response.redirect(302, target.toString());
  }

  @Get('auth/callback')
  @Header('Cache-Control', 'no-store')
  @Header('Referrer-Policy', 'no-referrer')
  async callback(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const accessToken = request.query.access_token;
    const state = request.query.state;
    const tokenType = request.query.token_type;

    const stateRemoval =
      state !== undefined
        ? buildCookieRemoval(
            this.names.state,
            SSO_STATE_COOKIE_PATH,
            this.secure,
          )
        : undefined;

    if (stateRemoval) {
      response.setHeader('Set-Cookie', [stateRemoval]);
    }

    if (
      typeof accessToken !== 'string' ||
      !accessToken.trim()
    ) {
      throw new BadRequestException('Missing access_token');
    }

    // เข้าจาก sidebar ของ Core Hub: ทิ้ง token แล้วเริ่ม flow ใหม่
    if (state === undefined) {
      response.redirect(302, '/auth/login');
      return;
    }

    const saved = readSsoState(
      request.headers.cookie,
      this.names.state,
    );

    if (
      typeof state !== 'string' ||
      state.length > 512 ||
      !saved ||
      !timingSafeEqualString(saved.state, state)
    ) {
      if (request.accepts(['json', 'html']) === 'html') {
        response
          .status(401)
          .type('html')
          .send(SIGN_IN_AGAIN_PAGE);
        return;
      }

      throw new UnauthorizedException(
        'Start sign-in again at /auth/login',
      );
    }

    if (
      tokenType !== undefined &&
      (typeof tokenType !== 'string' ||
        tokenType.toLowerCase() !== 'bearer')
    ) {
      throw new BadRequestException('Unsupported token_type');
    }

    const user =
      await this.authService.verifyAccessToken(accessToken);

    const subsystemRole =
      CORE_ROLE_TO_SUBSYSTEM_ROLE[user.role];

    if (!subsystemRole || !ROLE_PERMISSIONS[subsystemRole]?.length) {
      throw new ForbiddenException(
        'Your role has no access to this subsystem',
      );
    }

    if (typeof user.exp !== 'number') {
      throw new UnauthorizedException(
        'Token has no expiration time',
      );
    }

    const remainingLifetime =
      user.exp - Math.floor(Date.now() / 1000);

    if (remainingLifetime <= 0) {
      throw new UnauthorizedException('Token has expired');
    }

    response.setHeader('Set-Cookie', [
      stateRemoval as string,
      buildSsoCookie(
        this.names.session,
        accessToken,
        remainingLifetime,
        this.secure,
      ),
    ]);

    response.redirect(
      302,
      safeNextPath(saved.landing, SUBSYSTEM_BLOCKED_NEXT) ?? '/',
    );
  }

  @Post('auth/logout')
  @Header('Cache-Control', 'no-store')
  logout(@Res() response: Response): void {
    response.setHeader('Set-Cookie', [
      buildCookieRemoval(
        this.names.session,
        '/',
        this.secure,
      ),
      buildCookieRemoval(
        this.names.state,
        SSO_STATE_COOKIE_PATH,
        this.secure,
      ),
    ]);

    response.redirect(303, `${this.coreHubWebUrl}/logout`);
  }

  @UseGuards(AuthGuard)
  @Get('api/v1/me')
  @Header('Cache-Control', 'no-store')
  getMe(@Req() request: Request) {
    const user = request.user;
    const subsystemRole = CORE_ROLE_TO_SUBSYSTEM_ROLE[user.role];

    return {
      id: user.sub,
      email: user.email,
      coreRole: user.role,
      subsystemRole,
      permissions: subsystemRole ? ROLE_PERMISSIONS[subsystemRole] : [],
      sid: user.sid,
      session: {
        expiresAt:
          typeof user.exp === 'number'
            ? new Date(user.exp * 1000).toISOString()
            : null,
      },
    };
  }
}