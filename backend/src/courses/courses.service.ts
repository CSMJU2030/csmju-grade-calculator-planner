import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { PRISMA_SERVICE } from '../prisma/prisma.token';

interface CreateCourseData {
  courseCode?: string | null;
  courseName: string;
  credits?: number | null;
}

interface UpdateCourseData {
  courseCode?: string | null;
  courseName?: string;
  credits?: number | null;
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
    const details = this.validateDetails(data);
    return this.prisma.course.create({
      data: {
        coreUserId,
        courseCode: details.courseCode ?? null,
        courseName: details.courseName as string,
        credits: details.credits ?? null,
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
      data: this.validateDetails(data),
      include: {
        gradeItems: true,
      },
    });
  }

  private validateDetails(data: UpdateCourseData): UpdateCourseData {
    const result: UpdateCourseData = {};
    if (data.courseName !== undefined) {
      if (typeof data.courseName !== 'string' || !data.courseName.trim()) {
        throw new BadRequestException('กรุณากรอกชื่อวิชา');
      }
      result.courseName = data.courseName.trim();
    }
    if (data.courseCode !== undefined) {
      if (data.courseCode !== null && typeof data.courseCode !== 'string') {
        throw new BadRequestException('รหัสวิชาต้องเป็นข้อความ');
      }
      result.courseCode = data.courseCode?.trim() || null;
    }
    if (data.credits !== undefined) {
      if (data.credits !== null && (!Number.isInteger(data.credits) || data.credits < 1)) {
        throw new BadRequestException('หน่วยกิตต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
      }
      result.credits = data.credits;
    }
    return result;
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
