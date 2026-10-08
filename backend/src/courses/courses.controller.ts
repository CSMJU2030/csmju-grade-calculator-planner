import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { CoursesService } from './courses.service';
import { CourseQueryDto } from './dto/course-query.dto';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

import { AuthGuard } from '../auth/auth.guard';
import { PermissionsGuard } from '../auth/permissions.guard';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Permission } from '../auth/permissions';

@UseGuards(AuthGuard, PermissionsGuard)
@Controller('v1/courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
  ) {}

  @Get()
  @RequirePermissions(Permission.COURSE_READ_OWN)
  async findAll(
    @Req() req: Request,
    @Query() query: CourseQueryDto,
  ) {
    return this.coursesService.findAllByOwner(
      req.user.sub,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequirePermissions(Permission.COURSE_READ_OWN)
  async findOne(
    @Param(
      'id',
      new ParseUUIDPipe({ version: '4' }),
    )
    id: string,
    @Req() req: Request,
  ) {
    return this.coursesService.findOneByOwner(
      id,
      req.user.sub,
    );
  }

  @Post()
  @RequirePermissions(Permission.COURSE_CREATE)
  async create(
    @Body() body: CreateCourseDto,
    @Req() req: Request,
  ) {
    return this.coursesService.create(
      req.user.sub,
      body,
    );
  }

  @Patch(':id')
  @RequirePermissions(Permission.COURSE_UPDATE)
  async update(
    @Param(
      'id',
      new ParseUUIDPipe({ version: '4' }),
    )
    id: string,
    @Body() body: UpdateCourseDto,
    @Req() req: Request,
  ) {
    return this.coursesService.updateByOwner(
      id,
      req.user.sub,
      body,
    );
  }

  @Delete(':id')
  @RequirePermissions(Permission.COURSE_DELETE)
  async delete(
    @Param(
      'id',
      new ParseUUIDPipe({ version: '4' }),
    )
    id: string,
    @Req() req: Request,
  ) {
    return this.coursesService.deleteByOwner(id, req.user.sub);
  }
}