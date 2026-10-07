import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

// Only the guard is isolated; production JWT verification remains in AuthService.
describe('AuthGuard', () => {
  const authService = { verifyAccessToken: jest.fn() };
  let guard: AuthGuard;
  let previousId: string | undefined;

  beforeEach(() => {
    jest.resetAllMocks();
    previousId = process.env.SUBSYSTEM_ID;
    process.env.SUBSYSTEM_ID = 'csmju-grade-calculator-planner';
    guard = new AuthGuard(authService as unknown as AuthService);
  });
  afterEach(() => {
    if (previousId === undefined) delete process.env.SUBSYSTEM_ID;
    else process.env.SUBSYSTEM_ID = previousId;
  });

  function context(headers: Record<string, string>) {
    const request: { headers: Record<string, string>; user?: unknown } = { headers };
    const ctx = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
    return { ctx, request };
  }

  it('rejects a request with no token before calling token verification', async () => {
    const { ctx } = context({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('rejects malformed Authorization instead of falling back to a cookie', async () => {
    const { ctx } = context({ authorization: 'Basic value', cookie: 'csmju_grade_calculator_planner_access_token=cookie-token' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(authService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('allows lecturer only after token verification', async () => {
    const user = { sub: 'lecturer-001', email: '', role: 'lecturer', sid: 'session-001' };
    authService.verifyAccessToken.mockResolvedValue(user);
    const { ctx, request } = context({ authorization: 'Bearer verified-by-service' });
    expect(await guard.canActivate(ctx)).toBe(true);
    expect(authService.verifyAccessToken).toHaveBeenCalledWith('verified-by-service');
    expect(request.user).toEqual(user);
  });

  it.each(['alumni', 'guest'])('does not accept unmapped role %s', async (role) => {
    authService.verifyAccessToken.mockResolvedValue({ sub: 'user-001', email: '', role, sid: 'session-001' });
    const { ctx, request } = context({ authorization: 'Bearer verified-by-service' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(ForbiddenException);
    expect(request.user).toBeUndefined();
  });

  it('propagates token verification failure and does not attach a user', async () => {
    authService.verifyAccessToken.mockRejectedValue(new UnauthorizedException('Invalid access token'));
    const { ctx, request } = context({ authorization: 'Bearer invalid-token' });
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(request.user).toBeUndefined();
  });
});
