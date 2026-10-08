import {
  BadRequestException,
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

    this.validateScores(data.name, data.score ?? null, data.maxScore, data.weightPercentage);

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

    this.validateScores(
      data.name ?? gradeItem.name,
      data.score === undefined ? (gradeItem.score === null ? null : Number(gradeItem.score)) : data.score,
      data.maxScore ?? Number(gradeItem.maxScore),
      data.weightPercentage ?? Number(gradeItem.weightPercentage),
    );

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

  private validateScores(name: string, score: number | null, maxScore: number, weight: number) {
    const precise = (value: number) => Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
    if (!name.trim()) throw new BadRequestException('กรุณากรอกชื่อรายการคะแนน');
    if (!precise(maxScore) || maxScore <= 0 || maxScore > 99999999.99) {
      throw new BadRequestException('คะแนนเต็มต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง');
    }
    if (score !== null && (!precise(score) || score < 0 || score > maxScore)) {
      throw new BadRequestException('คะแนนต้องอยู่ระหว่าง 0 ถึงคะแนนเต็ม และมีทศนิยมไม่เกิน 2 ตำแหน่ง');
    }
    if (!precise(weight) || weight < 0 || weight > 100) {
      throw new BadRequestException('น้ำหนักต้องอยู่ระหว่าง 0 ถึง 100 และมีทศนิยมไม่เกิน 2 ตำแหน่ง');
    }
  }

}
