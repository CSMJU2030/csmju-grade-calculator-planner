import { RequestMethod } from '@nestjs/common';

// Shared by the entrypoint and HTTP routing regression tests.
// Business controllers declare v1/...; health is /api/health.
export const GLOBAL_PREFIX_OPTIONS = {
  exclude: [
    { path: '/', method: RequestMethod.GET },
    { path: 'auth/login', method: RequestMethod.GET },
    { path: 'auth/callback', method: RequestMethod.GET },
    { path: 'auth/logout', method: RequestMethod.POST },
  ],
};
