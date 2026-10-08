import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PermissionsGuard } from './permissions.guard';
import { Permission } from './permissions';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new PermissionsGuard(
      reflector as unknown as Reflector,
    );
  });

  function createContext(user: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  describe('course:read:own', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue([
        Permission.COURSE_READ_OWN,
      ]);
    });

    it('should allow student', () => {
      expect(
        guard.canActivate(
          createContext({
            sub: 'user-001',
            email: 'student@core.local',
            role: 'student',
            sid: 'session-001',
          }),
        ),
      ).toBe(true);
    });

    it('should allow staff', () => {
      expect(
        guard.canActivate(
          createContext({
            sub: 'user-003',
            email: 'staff@core.local',
            role: 'staff',
            sid: 'session-003',
          }),
        ),
      ).toBe(true);
    });

    it('should allow admin', () => {
      expect(
        guard.canActivate(
          createContext({
            sub: 'user-001',
            email: 'admin@core.local',
            role: 'admin',
            sid: 'session-001',
          }),
        ),
      ).toBe(true);
    });

    it('should deny alumni', () => {
      expect(() =>
        guard.canActivate(
          createContext({
            sub: 'user-004',
            email: 'alumni@core.local',
            role: 'alumni',
            sid: 'session-004',
          }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('course:create', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue([
        Permission.COURSE_CREATE,
      ]);
    });

    it('should allow staff', () => {
      expect(
        guard.canActivate(
          createContext({
            sub: 'user-003',
            email: 'staff@core.local',
            role: 'staff',
            sid: 'session-003',
          }),
        ),
      ).toBe(true);
    });

    it('should allow admin', () => {
      expect(
        guard.canActivate(
          createContext({
            sub: 'user-001',
            email: 'admin@core.local',
            role: 'admin',
            sid: 'session-001',
          }),
        ),
      ).toBe(true);
    });

    it('should deny student', () => {
      expect(() =>
        guard.canActivate(
          createContext({
            sub: 'user-002',
            email: 'student@core.local',
            role: 'student',
            sid: 'session-002',
          }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('should deny alumni', () => {
      expect(() =>
        guard.canActivate(
          createContext({
            sub: 'user-004',
            email: 'alumni@core.local',
            role: 'alumni',
            sid: 'session-004',
          }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('course:update', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue([
        Permission.COURSE_UPDATE,
      ]);
    });

    it('should allow staff', () => {
      expect(
        guard.canActivate(
          createContext({
            sub: 'user-003',
            email: 'staff@core.local',
            role: 'staff',
            sid: 'session-003',
          }),
        ),
      ).toBe(true);
    });

    it('should allow admin', () => {
      expect(
        guard.canActivate(
          createContext({
            sub: 'user-001',
            email: 'admin@core.local',
            role: 'admin',
            sid: 'session-001',
          }),
        ),
      ).toBe(true);
    });

    it('should deny student', () => {
      expect(() =>
        guard.canActivate(
          createContext({
            sub: 'user-002',
            email: 'student@core.local',
            role: 'student',
            sid: 'session-002',
          }),
        ),
      ).toThrow(ForbiddenException);
    });
  });

  describe('course:delete', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue([
        Permission.COURSE_DELETE,
      ]);
    });

    it('should allow admin', () => {
      expect(
        guard.canActivate(
          createContext({
            sub: 'user-001',
            email: 'admin@core.local',
            role: 'admin',
            sid: 'session-001',
          }),
        ),
      ).toBe(true);
    });

    it('should deny staff', () => {
      expect(() =>
        guard.canActivate(
          createContext({
            sub: 'user-003',
            email: 'staff@core.local',
            role: 'staff',
            sid: 'session-003',
          }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('should deny student', () => {
      expect(() =>
        guard.canActivate(
          createContext({
            sub: 'user-002',
            email: 'student@core.local',
            role: 'student',
            sid: 'session-002',
          }),
        ),
      ).toThrow(ForbiddenException);
    });

    it('should deny alumni', () => {
      expect(() =>
        guard.canActivate(
          createContext({
            sub: 'user-004',
            email: 'alumni@core.local',
            role: 'alumni',
            sid: 'session-004',
          }),
        ),
      ).toThrow(ForbiddenException);
    });
  });
  describe('G0 role mapping', () => {
    beforeEach(() => {
      reflector.getAllAndOverride.mockReturnValue([Permission.COURSE_READ_OWN]);
    });

    it('allows lecturer to use owner-scoped course read', () => {
      expect(guard.canActivate(createContext({ sub: 'lecturer-001', role: 'lecturer' }))).toBe(true);
    });

    it.each(['alumni', 'guest', 'unknown'])('rejects unsupported role %s with 403', (role) => {
      expect(() => guard.canActivate(createContext({ sub: 'user-001', role })))
        .toThrow(ForbiddenException);
    });

    it('does not grant lecturer course delete', () => {
      reflector.getAllAndOverride.mockReturnValue([Permission.COURSE_DELETE]);
      expect(() => guard.canActivate(createContext({ sub: 'lecturer-001', role: 'lecturer' })))
        .toThrow(ForbiddenException);
    });
  });

});