import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { AuthController } from '../auth/auth.controller';
import { AuthGuard } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { PermissionsGuard } from '../auth/permissions.guard';
import { CoursesController } from '../courses/courses.controller';
import { CoursesService } from '../courses/courses.service';
import { GradeItemsController } from '../grade-items/grade-items.controller';
import { GradeItemsService } from '../grade-items/grade-items.service';
import { GradePlanningController } from '../grade-planning/grade-planning.controller';
import { GradePlanningService } from '../grade-planning/grade-planning.service';
import { HealthController } from '../health/health.controller';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { GLOBAL_PREFIX_OPTIONS } from './routing';

// These tests use the actual controllers, guards and prefix exclusions.
// Only JWT verification and database services are mocked; no Core Hub/DB calls.
describe('HTTP routes with the api prefix', () => {
  let app: INestApplication;
  const id = '11111111-1111-4111-8111-111111111111';
  const user = { sub: 'route-owner', email: '', role: 'staff', sid: 'route-session' };
  const auth = { verifyAccessToken: jest.fn() };
  const courses = { findAllByOwner: jest.fn(), findOneByOwner: jest.fn(), create: jest.fn() };
  const items = { findAllByCourse: jest.fn() };
  const planning = { plan: jest.fn() };
  const envNames = ['SUBSYSTEM_ID', 'CORE_HUB_WEB_URL', 'NODE_ENV'] as const;
  const oldEnv = new Map<string, string | undefined>();

  beforeAll(async () => {
    for (const name of envNames) oldEnv.set(name, process.env[name]);
    process.env.SUBSYSTEM_ID = 'csmju-grade-calculator-planner';
    process.env.CORE_HUB_WEB_URL = 'https://csmju2030.jowave.com';
    process.env.NODE_ENV = 'development';
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController, AuthController, CoursesController, GradeItemsController, GradePlanningController, HealthController],
      providers: [
        AppService, AuthGuard, PermissionsGuard,
        { provide: AuthService, useValue: auth },
        { provide: CoursesService, useValue: courses },
        { provide: GradeItemsService, useValue: items },
        { provide: GradePlanningService, useValue: planning },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', GLOBAL_PREFIX_OPTIONS);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    auth.verifyAccessToken.mockResolvedValue(user);
  });

  afterAll(async () => {
    if (app) await app.close();
    for (const name of envNames) {
      const saved = oldEnv.get(name);
      if (saved === undefined) delete process.env[name];
      else process.env[name] = saved;
    }
  });

  it('keeps the public health response at /api/health', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(response.body).toEqual({ success: true, data: { status: 'ok', service: 'csmju-grade-calculator-planner' }, meta: {} });
  });

  it('keeps the existing root route outside the prefix', async () => {
    await request(app.getHttpServer()).get('/').expect(200);
  });

  it('keeps GET /auth/login outside api and starts the state flow', async () => {
    const response = await request(app.getHttpServer()).get('/auth/login?next=%2Fcourses').expect(302);
    const location = new URL(response.headers.location as string);
    expect(location.origin).toBe('https://csmju2030.jowave.com');
    expect(location.pathname).toBe('/sso/authorize');
    expect(location.searchParams.get('subsystem')).toBe('csmju-grade-calculator-planner');
    expect(location.searchParams.get('state')).toBeTruthy();
    expect(response.headers['set-cookie']).toBeDefined();
    expect(auth.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('keeps GET /auth/callback outside api and validates required input', async () => {
    const response = await request(app.getHttpServer()).get('/auth/callback').expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('keeps POST /auth/logout outside api', async () => {
    const response = await request(app.getHttpServer()).post('/auth/logout').expect(303);
    expect(response.headers.location).toBe('https://csmju2030.jowave.com/logout');
    expect(response.headers['set-cookie']).toHaveLength(2);
  });

  it.each(['/api/v1/me', '/api/v1/courses', `/api/v1/courses/${id}/grade-items`, `/api/v1/courses/${id}/grade-planning`])(
    'requires login at the existing route %s', async (url) => {
      const response = await request(app.getHttpServer()).get(url).expect(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
      expect(auth.verifyAccessToken).not.toHaveBeenCalled();
    },
  );

  it('keeps /api/v1/me and verifies its bearer token', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/me').set('Authorization', 'Bearer route-test-token').expect(200);
    expect(auth.verifyAccessToken).toHaveBeenCalledWith('route-test-token');
    expect(response.body.data.id).toBe(user.sub);
    expect(response.body.data.coreRole).toBe('staff');
  });

  it('keeps paginated courses and passes the verified owner to the service', async () => {
    courses.findAllByOwner.mockResolvedValue({ data: [], meta: { total: 0, page: 2, limit: 20, totalPages: 0 } });
    await request(app.getHttpServer()).get('/api/v1/courses?page=2&limit=20').set('Authorization', 'Bearer route-test-token').expect(200);
    expect(courses.findAllByOwner).toHaveBeenCalledWith(user.sub, 2, 20);
  });

  it('keeps nested grade items and their owner check', async () => {
    items.findAllByCourse.mockResolvedValue([]);
    await request(app.getHttpServer()).get(`/api/v1/courses/${id}/grade-items`).set('Authorization', 'Bearer route-test-token').expect(200);
    expect(items.findAllByCourse).toHaveBeenCalledWith(id, user.sub);
  });

  it('keeps grade planning under the existing course route', async () => {
    planning.plan.mockResolvedValue({ courseId: id, targetGrade: 'A' });
    await request(app.getHttpServer()).get(`/api/v1/courses/${id}/grade-planning?targetGrade=A`).set('Authorization', 'Bearer route-test-token').expect(200);
    expect(planning.plan).toHaveBeenCalledWith(id, user.sub, 'A');
  });

  it('does not create an accidental /api/api/v1/me route', async () => {
    await request(app.getHttpServer()).get('/api/api/v1/me').expect(404);
  });

  it('still rejects a bearer token that fails verification', async () => {
    auth.verifyAccessToken.mockRejectedValue(new UnauthorizedException('Invalid access token'));
    await request(app.getHttpServer()).get('/api/v1/me').set('Authorization', 'Bearer invalid-route-token').expect(401);
  });
});
