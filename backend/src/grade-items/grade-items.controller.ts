import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

import { GradeItemsService } from './grade-items.service';
import { CreateGradeItemDto } from './dto/create-grade-item.dto';
import { UpdateGradeItemDto } from './dto/update-grade-item.dto';

@UseGuards(AuthGuard, PermissionsGuard)
@Controller('api/v1')
export class GradeItemsController {
  constructor(
    private readonly gradeItemsService: GradeItemsService,
  ) {}

  @Get('courses/:id/grade-items')
  @RequirePermissions(Permission.GRADE_ITEM_READ_OWN)
  async findAll(
    @Param(
      'id',
      new ParseUUIDPipe({ version: '4' }),
    )
    courseId: string,
    @Req() req: Request,
  ) {
    return this.gradeItemsService.findAllByCourse(
      courseId,
      req.user.sub,
    );
  }

  @Post('courses/:id/grade-items')
  @RequirePermissions(Permission.GRADE_ITEM_CREATE_OWN)
  async create(
    @Param(
      'id',
      new ParseUUIDPipe({ version: '4' }),
    )
    courseId: string,
    @Body() body: CreateGradeItemDto,
    @Req() req: Request,
  ) {
    return this.gradeItemsService.createForCourse(
      courseId,
      req.user.sub,
      body,
    );
  }

  @Patch('grade-items/:id')
  @RequirePermissions(Permission.GRADE_ITEM_UPDATE_OWN)
  async update(
    @Param(
      'id',
      new ParseUUIDPipe({ version: '4' }),
    )
    id: string,
    @Body() body: UpdateGradeItemDto,
    @Req() req: Request,
  ) {
    return this.gradeItemsService.updateByOwner(
      id,
      req.user.sub,
      body,
    );
  }

  @Delete('grade-items/:id')
  @RequirePermissions(Permission.GRADE_ITEM_DELETE_OWN)
  async delete(
    @Param(
      'id',
      new ParseUUIDPipe({ version: '4' }),
    )
    id: string,
    @Req() req: Request,
  ) {
    return this.gradeItemsService.deleteByOwner(
      id,
      req.user.sub,
    );
  }
}