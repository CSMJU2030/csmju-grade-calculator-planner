import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { PRISMA_SERVICE } from '../prisma/prisma.token';

interface CreateGradeItemData {
  name: string;
  score?: number | null;
  maxScore: number;
  weightPercentage: number;
}

interface UpdateGradeItemData {
  name?: string;
  score?: number | null;
  maxScore?: number;
  weightPercentage?: number;
}

@Injectable()
export class GradeItemsService {
  constructor(
    @Inject(PRISMA_SERVICE)
    private readonly prisma: PrismaService,
  ) {}

  async findAllByCourse(
    courseId: string,
    coreUserId: string,
  ) {
    const course =
      await this.prisma.course.findUnique({
        where: { id: courseId },
      });

    if (!course) {
      throw new NotFoundException(
        'Course not found',
      );
    }

    if (course.coreUserId !== coreUserId) {
      throw new ForbiddenException('Forbidden');
    }

    return this.prisma.gradeItem.findMany({
      where: { courseId },
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOneByOwner(
    id: string,
    coreUserId: string,
  ) {
    const gradeItem =
      await this.prisma.gradeItem.findUnique({
        where: { id },
        include: {
          course: true,
        },
      });

    if (!gradeItem) {
      throw new NotFoundException(
        'Grade item not found',
      );
    }

    if (
      gradeItem.course.coreUserId !==
      coreUserId
    ) {
      throw new ForbiddenException('Forbidden');
    }

    return gradeItem;
  }

  async createForCourse(
    courseId: string,
    coreUserId: string,
    data: CreateGradeItemData,
  ) {
    const course =
      await this.prisma.course.findUnique({
        where: { id: courseId },
      });

    if (!course) {
      throw new NotFoundException(
        'Course not found',
      );
    }

    if (course.coreUserId !== coreUserId) {
      throw new ForbiddenException('Forbidden');
    }

    return this.prisma.gradeItem.create({
      data: {
        courseId,
        name: data.name,
        score: data.score ?? null,
        maxScore: data.maxScore,
        weightPercentage:
          data.weightPercentage,
      },
    });
  }

  async updateByOwner(
    id: string,
    coreUserId: string,
    data: UpdateGradeItemData,
  ) {
    const gradeItem =
      await this.prisma.gradeItem.findUnique({
        where: { id },
        include: {
          course: true,
        },
      });

    if (!gradeItem) {
      throw new NotFoundException(
        'Grade item not found',
      );
    }

    if (
      gradeItem.course.coreUserId !==
      coreUserId
    ) {
      throw new ForbiddenException('Forbidden');
    }

    return this.prisma.gradeItem.update({
      where: { id },
      data,
    });
  }

  async deleteByOwner(
    id: string,
    coreUserId: string,
  ) {
    const gradeItem =
      await this.prisma.gradeItem.findUnique({
        where: { id },
        include: {
          course: true,
        },
      });

    if (!gradeItem) {
      throw new NotFoundException(
        'Grade item not found',
      );
    }

    if (
      gradeItem.course.coreUserId !==
      coreUserId
    ) {
      throw new ForbiddenException('Forbidden');
    }

    await this.prisma.gradeItem.delete({
      where: { id },
    });

    return {
      id,
      deleted: true,
    };
  }
}
