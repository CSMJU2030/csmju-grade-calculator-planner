import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthService } from './auth.service';
import { ROLE_PERMISSIONS } from './permissions';
import { CORE_ROLE_TO_SUBSYSTEM_ROLE } from './role-mapping';
import { readCookie, ssoCookieNames } from './sso-session';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly sessionCookie: string;

  constructor(private readonly authService: AuthService) {
    const subsystemId = process.env.SUBSYSTEM_ID?.trim();

    if (!subsystemId) {
      throw new Error('SUBSYSTEM_ID is required');
    }

    this.sessionCookie = ssoCookieNames(subsystemId).session;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authorization = request.headers.authorization;

    let token: string | null;

    if (authorization !== undefined) {
      const match = /^Bearer\s+(\S+)$/i.exec(authorization.trim());

      if (!match) {
        throw new UnauthorizedException('Invalid Authorization header');
      }

      token = match[1];
    } else {
      token = readCookie(
        request.headers.cookie,
        this.sessionCookie,
      );
    }

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const user = await this.authService.verifyAccessToken(token);
    const subsystemRole =
      CORE_ROLE_TO_SUBSYSTEM_ROLE[user.role];

    if (!subsystemRole || !ROLE_PERMISSIONS[subsystemRole]?.length) {
      throw new ForbiddenException(
        'Your role has no access to this subsystem',
      );
    }

    request.user = user;

    return true;
  }
}