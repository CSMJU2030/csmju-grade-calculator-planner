import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { CORE_ROLE_TO_SUBSYSTEM_ROLE } from './role-mapping';
import {
  Permission,
  ROLE_PERMISSIONS,
} from './permissions';
import { REQUIRED_PERMISSIONS } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions =
      this.reflector.getAllAndOverride<Permission[]>(
        REQUIRED_PERMISSIONS,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Forbidden');
    }

    const subsystemRole = CORE_ROLE_TO_SUBSYSTEM_ROLE[user.role];

    if (!subsystemRole) {
      throw new ForbiddenException('Forbidden');
    }

    const permissions = ROLE_PERMISSIONS[subsystemRole];

    const hasPermission = requiredPermissions.some((permission) =>
      permissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Forbidden');
    }

    return true;
  }
}