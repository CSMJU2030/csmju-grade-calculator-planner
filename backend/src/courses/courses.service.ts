import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { PRISMA_SERVICE } from '../prisma/prisma.token';

interface CreateCourseData {
  courseCode: string;
  courseName: string;
  credits: number;
}

interface UpdateCourseData {
  courseCode?: string;
  courseName?: string;
  credits?: number;
}

@Injectable()
export class CoursesService {
  constructor(
    @Inject(PRISMA_SERVICE)
    private readonly prisma: PrismaService,
  ) {}

  async findAllByOwner(
  coreUserId: string,
  page = 1,
  limit = 10,
) {
  const skip = (page - 1) * limit;

  const where = {
    coreUserId,
  };

  const [data, total] = await this.prisma.$transaction([
    this.prisma.course.findMany({
      where,
      include: {
        gradeItems: true,
      },
      orderBy: {
        id: 'asc',
      },
      skip,
      take: limit,
    }),

    this.prisma.course.count({
      where,
    }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

  async findOneByOwner(
    id: string,
    coreUserId: string,
  ) {
    const course =
      await this.prisma.course.findUnique({
        where: { id },
        include: {
          gradeItems: true,
        },
      });

    if (!course) {
      throw new NotFoundException(
        'Course not found',
      );
    }

    if (course.coreUserId !== coreUserId) {
      throw new ForbiddenException('Forbidden');
    }

    return course;
  }

  async create(
    coreUserId: string,
    data: CreateCourseData,
  ) {
    return this.prisma.course.create({
      data: {
        coreUserId,
        courseCode: data.courseCode,
        courseName: data.courseName,
        credits: data.credits,
      },
      include: {
        gradeItems: true,
      },
    });
  }

  async updateByOwner(
    id: string,
    coreUserId: string,
    data: UpdateCourseData,
  ) {
    const course =
      await this.prisma.course.findUnique({
        where: { id },
      });

    if (!course) {
      throw new NotFoundException(
        'Course not found',
      );
    }

    if (course.coreUserId !== coreUserId) {
      throw new ForbiddenException('Forbidden');
    }

    return this.prisma.course.update({
      where: { id },
      data,
      include: {
        gradeItems: true,
      },
    });
  }

  async deleteByOwner(id: string, coreUserId: string) {
    const course =
      await this.prisma.course.findUnique({
        where: { id },
      });

    if (!course) {
      throw new NotFoundException(
        'Course not found',
      );
    }

    if (course.coreUserId !== coreUserId) {
      throw new ForbiddenException('Forbidden');
    }

    await this.prisma.course.delete({
      where: { id },
    });

    return {
      id,
      deleted: true,
    };
  }
}
