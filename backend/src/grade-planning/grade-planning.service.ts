import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { PrismaService } from '../prisma/prisma.service';
import { PRISMA_SERVICE } from '../prisma/prisma.token';

import {
  GRADE_THRESHOLDS,
  TargetGrade,
} from './grade-thresholds';

@Injectable()
export class GradePlanningService {
  constructor(
    @Inject(PRISMA_SERVICE)
    private readonly prisma: PrismaService,
  ) {}

  async plan(
    courseId: string,
    coreUserId: string,
    targetGrade: string,
  ) {
    if (
      typeof targetGrade !== 'string' ||
      !targetGrade.trim()
    ) {
      throw new BadRequestException(
        'Invalid target grade',
      );
    }

    const target =
      targetGrade.toUpperCase() as TargetGrade;

    if (!(target in GRADE_THRESHOLDS)) {
      throw new BadRequestException(
        'Invalid target grade',
      );
    }

    const course =
      await this.prisma.course.findUnique({
        where: { id: courseId },
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

    let currentWeightedScore = 0;
    let completedWeight = 0;

    for (const item of course.gradeItems) {
      if (item.score === null) {
        continue;
      }

      const score = Number(item.score);
      const maxScore = Number(item.maxScore);
      const weight = Number(item.weightPercentage);

      if (maxScore <= 0) {
        continue;
      }

      const percentage = score / maxScore;

      currentWeightedScore +=
        percentage * weight;

      completedWeight += weight;
    }

    const remainingWeight =
      Math.max(0, 100 - completedWeight);

    const requiredScore =
      GRADE_THRESHOLDS[target];

    const additionalWeightedScore =
      requiredScore -
      currentWeightedScore;

    let requiredAverageOnRemaining:
      | number
      | null = null;

    if (remainingWeight > 0) {
      requiredAverageOnRemaining =
        Math.max(0, (additionalWeightedScore /
          remainingWeight) *
        100);
    }

    const currentGrade =
      this.calculateCurrentGrade(
        currentWeightedScore,
      );

    return {
      courseId: course.id,
      courseCode: course.courseCode,
      courseName: course.courseName,

      targetGrade: target,
      targetScore: requiredScore,

      currentWeightedScore: Number(
        currentWeightedScore.toFixed(2),
      ),

      completedWeight: Number(
        completedWeight.toFixed(2),
      ),

      remainingWeight: Number(
        remainingWeight.toFixed(2),
      ),

      requiredAverageOnRemaining:
        requiredAverageOnRemaining === null
          ? null
          : Number(
              requiredAverageOnRemaining.toFixed(
                2,
              ),
            ),

      currentGrade,
    };
  }

  private calculateCurrentGrade(
    score: number,
  ): string {
    if (score >= GRADE_THRESHOLDS.A) {
      return 'A';
    }

    if (
      score >=
      GRADE_THRESHOLDS['B+']
    ) {
      return 'B+';
    }

    if (score >= GRADE_THRESHOLDS.B) {
      return 'B';
    }

    if (
      score >=
      GRADE_THRESHOLDS['C+']
    ) {
      return 'C+';
    }

    if (score >= GRADE_THRESHOLDS.C) {
      return 'C';
    }

    if (
      score >=
      GRADE_THRESHOLDS['D+']
    ) {
      return 'D+';
    }

    if (score >= GRADE_THRESHOLDS.D) {
      return 'D';
    }

    return 'F';
  }
}