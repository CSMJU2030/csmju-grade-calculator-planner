import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

import { GradePlanningService } from './grade-planning.service';

@UseGuards(AuthGuard, PermissionsGuard)
@Controller('api/v1/courses')
export class GradePlanningController {
  constructor(
    private readonly gradePlanningService: GradePlanningService,
  ) {}

  @Get(':id/grade-planning')
  @RequirePermissions(
    Permission.GRADE_PLANNING_READ_OWN,
  )
  async plan(
    @Param(
      'id',
      new ParseUUIDPipe({ version: '4' }),
    )
    id: string,
    @Query('targetGrade') targetGrade: string,
    @Req() req: Request,
  ) {
    return this.gradePlanningService.plan(
      id,
      req.user.sub,
      targetGrade,
    );
  }
}