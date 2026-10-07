import { Controller, Get } from '@nestjs/common';

@Controller('api/health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: process.env.SUBSYSTEM_ID?.trim() ?? 'csmju-grade-calculator-planner',
    };
  }
}