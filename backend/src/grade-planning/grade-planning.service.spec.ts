import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { GradePlanningService } from './grade-planning.service';

describe('GradePlanningService', () => {
  let service: GradePlanningService;

  const prisma = {
    course: {
      findUnique: jest.fn(),
    },
  };

  const courseId = '11111111-1111-4111-8111-111111111111';
  const gradeItemId1 = '22222222-2222-4222-8222-222222222222';
  const gradeItemId2 = '33333333-3333-4333-8333-333333333333';
  const gradeItemId3 = '44444444-4444-4444-8444-444444444444';
  const missingCourseId = '99999999-9999-4999-8999-999999999999';

  beforeEach(() => {
    jest.clearAllMocks();

    service = new GradePlanningService(
      prisma as any,
    );
  });

  it('should calculate required score for target B', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: courseId,
      coreUserId: 'user-001',
      courseCode: 'CSMJU2030',
      courseName: 'Senior Full-Stack',
      credits: 3,
      gradeItems: [
        {
          id: gradeItemId1,
          score: 80,
          maxScore: 100,
          weightPercentage: 20,
        },
        {
          id: gradeItemId2,
          score: 70,
          maxScore: 100,
          weightPercentage: 30,
        },
        {
          id: gradeItemId3,
          score: null,
          maxScore: 100,
          weightPercentage: 50,
        },
      ],
    });

    const result = await service.plan(
      courseId,
      'user-001',
      'B',
    );

    expect(result.targetGrade).toBe('B');
    expect(result.targetScore).toBe(70);

    expect(result.currentWeightedScore).toBe(37);
    expect(result.completedWeight).toBe(50);
    expect(result.remainingWeight).toBe(50);

    expect(
      result.requiredAverageOnRemaining,
    ).toBe(66);

    expect(result.currentGrade).toBe('F');
  });

  it('should calculate target A correctly', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: courseId,
      coreUserId: 'user-001',
      courseCode: 'CSMJU2030',
      courseName: 'Senior Full-Stack',
      credits: 3,
      gradeItems: [
        {
          id: gradeItemId1,
          score: 90,
          maxScore: 100,
          weightPercentage: 40,
        },
        {
          id: gradeItemId2,
          score: null,
          maxScore: 100,
          weightPercentage: 60,
        },
      ],
    });

    const result = await service.plan(
      courseId,
      'user-001',
      'A',
    );

    expect(result.targetGrade).toBe('A');
    expect(result.targetScore).toBe(80);

    expect(result.currentWeightedScore).toBe(36);
    expect(result.remainingWeight).toBe(60);

    expect(
      result.requiredAverageOnRemaining,
    ).toBeCloseTo(73.33, 2);
  });

  it('should accept B+ as a target grade', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: courseId,
      coreUserId: 'user-001',
      courseCode: 'CSMJU2030',
      courseName: 'Senior Full-Stack',
      credits: 3,
      gradeItems: [
        {
          id: gradeItemId1,
          score: 80,
          maxScore: 100,
          weightPercentage: 50,
        },
        {
          id: gradeItemId2,
          score: null,
          maxScore: 100,
          weightPercentage: 50,
        },
      ],
    });

    const result = await service.plan(
      courseId,
      'user-001',
      'b+',
    );

    expect(result.targetGrade).toBe('B+');
    expect(result.targetScore).toBe(75);
    expect(result.currentWeightedScore).toBe(40);
    expect(
      result.requiredAverageOnRemaining,
    ).toBe(70);
  });

  it('should ignore grade items without a score', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: courseId,
      coreUserId: 'user-001',
      courseCode: 'CSMJU2030',
      courseName: 'Senior Full-Stack',
      credits: 3,
      gradeItems: [
        {
          id: gradeItemId1,
          score: null,
          maxScore: 100,
          weightPercentage: 50,
        },
        {
          id: gradeItemId2,
          score: 80,
          maxScore: 100,
          weightPercentage: 20,
        },
      ],
    });

    const result = await service.plan(
      courseId,
      'user-001',
      'B',
    );

    expect(result.currentWeightedScore).toBe(16);
    expect(result.completedWeight).toBe(20);
    expect(result.remainingWeight).toBe(80);
  });

  it('should throw 404 when course does not exist', async () => {
    prisma.course.findUnique.mockResolvedValue(null);

    await expect(
      service.plan(
        missingCourseId,
        'user-001',
        'B',
      ),
    ).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('should throw 403 when course belongs to another user', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: courseId,
      coreUserId: 'user-002',
      courseCode: 'CSMJU2030',
      courseName: 'Senior Full-Stack',
      credits: 3,
      gradeItems: [],
    });

    await expect(
      service.plan(
        courseId,
        'user-001',
        'B',
      ),
    ).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('should throw 400 for invalid target grade', async () => {
    await expect(
      service.plan(
        courseId,
        'user-001',
        'X',
      ),
    ).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(
      prisma.course.findUnique,
    ).not.toHaveBeenCalled();
  });
});