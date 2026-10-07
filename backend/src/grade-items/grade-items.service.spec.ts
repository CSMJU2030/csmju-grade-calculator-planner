import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { GradeItemsService } from './grade-items.service';

describe('GradeItemsService', () => {
  const prisma = {
    course: {
      findUnique: jest.fn(),
    },
    gradeItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const courseId = '11111111-1111-4111-8111-111111111111';
  const gradeItemId = '22222222-2222-4222-8222-222222222222';
  const missingId = '99999999-9999-4999-8999-999999999999';

  const service = new GradeItemsService(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return grade items when the course belongs to the user', async () => {
    const course = {
      id: courseId,
      coreUserId: 'user-001',
    };

    const gradeItems = [
      {
        id: gradeItemId,
        courseId,
        name: 'Midterm',
        score: 80,
        maxScore: 100,
        weightPercentage: 30,
      },
    ];

    prisma.course.findUnique.mockResolvedValue(course);
    prisma.gradeItem.findMany.mockResolvedValue(gradeItems);

    await expect(
      service.findAllByCourse(courseId, 'user-001'),
    ).resolves.toEqual(gradeItems);
  });

  it('should return 403 when the course belongs to another user', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: courseId,
      coreUserId: 'user-002',
    });

    await expect(
      service.findAllByCourse(courseId, 'user-001'),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.gradeItem.findMany).not.toHaveBeenCalled();
  });

  it('should return 404 when the course does not exist', async () => {
    prisma.course.findUnique.mockResolvedValue(null);

    await expect(
      service.findAllByCourse(missingId, 'user-001'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should return a grade item when its parent course belongs to the user', async () => {
    const gradeItem = {
      id: gradeItemId,
      courseId,
      name: 'Midterm',
      score: 80,
      maxScore: 100,
      weightPercentage: 30,
      course: {
        id: courseId,
        coreUserId: 'user-001',
      },
    };

    prisma.gradeItem.findUnique.mockResolvedValue(gradeItem);

    await expect(
      service.findOneByOwner(gradeItemId, 'user-001'),
    ).resolves.toEqual(gradeItem);
  });

  it('should return 403 when the grade item belongs to another user through its course', async () => {
    prisma.gradeItem.findUnique.mockResolvedValue({
      id: gradeItemId,
      courseId,
      name: 'Midterm',
      score: 80,
      maxScore: 100,
      weightPercentage: 30,
      course: {
        id: courseId,
        coreUserId: 'user-002',
      },
    });

    await expect(
      service.findOneByOwner(gradeItemId, 'user-001'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should return 404 when the grade item does not exist', async () => {
    prisma.gradeItem.findUnique.mockResolvedValue(null);

    await expect(
      service.findOneByOwner(missingId, 'user-001'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should create a grade item for the user-owned course', async () => {
    const course = {
      id: courseId,
      coreUserId: 'user-001',
    };

    const createdGradeItem = {
      id: gradeItemId,
      courseId,
      name: 'Final',
      score: null,
      maxScore: 100,
      weightPercentage: 40,
    };

    prisma.course.findUnique.mockResolvedValue(course);
    prisma.gradeItem.create.mockResolvedValue(createdGradeItem);

    await expect(
      service.createForCourse(courseId, 'user-001', {
        name: 'Final',
        score: null,
        maxScore: 100,
        weightPercentage: 40,
      }),
    ).resolves.toEqual(createdGradeItem);

    expect(prisma.gradeItem.create).toHaveBeenCalledWith({
      data: {
        courseId,
        name: 'Final',
        score: null,
        maxScore: 100,
        weightPercentage: 40,
      },
    });
  });

  it('should return 403 when creating a grade item for another user course', async () => {
    prisma.course.findUnique.mockResolvedValue({
      id: courseId,
      coreUserId: 'user-002',
    });

    await expect(
      service.createForCourse(courseId, 'user-001', {
        name: 'Final',
        score: null,
        maxScore: 100,
        weightPercentage: 40,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.gradeItem.create).not.toHaveBeenCalled();
  });

  it('should update a grade item owned by the user', async () => {
    const gradeItem = {
      id: gradeItemId,
      courseId,
      name: 'Midterm',
      score: 80,
      maxScore: 100,
      weightPercentage: 30,
      course: {
        id: courseId,
        coreUserId: 'user-001',
      },
    };

    const updatedGradeItem = {
      ...gradeItem,
      score: 90,
    };

    prisma.gradeItem.findUnique.mockResolvedValue(gradeItem);
    prisma.gradeItem.update.mockResolvedValue(updatedGradeItem);

    await expect(
      service.updateByOwner(gradeItemId, 'user-001', {
        score: 90,
      }),
    ).resolves.toEqual(updatedGradeItem);
  });

  it('should return 403 when updating another user grade item', async () => {
    prisma.gradeItem.findUnique.mockResolvedValue({
      id: gradeItemId,
      courseId,
      name: 'Midterm',
      score: 80,
      maxScore: 100,
      weightPercentage: 30,
      course: {
        id: courseId,
        coreUserId: 'user-002',
      },
    });

    await expect(
      service.updateByOwner(gradeItemId, 'user-001', {
        score: 90,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.gradeItem.update).not.toHaveBeenCalled();
  });

  it('should delete a grade item owned by the user', async () => {
    const gradeItem = {
      id: gradeItemId,
      courseId,
      name: 'Midterm',
      score: 80,
      maxScore: 100,
      weightPercentage: 30,
      course: {
        id: courseId,
        coreUserId: 'user-001',
      },
    };

    prisma.gradeItem.findUnique.mockResolvedValue(gradeItem);
    prisma.gradeItem.delete.mockResolvedValue(gradeItem);

    await expect(
      service.deleteByOwner(gradeItemId, 'user-001'),
    ).resolves.toEqual({
      id: gradeItemId,
      deleted: true,
    });

    expect(prisma.gradeItem.delete).toHaveBeenCalledWith({
      where: {
        id: gradeItemId,
      },
    });
  });

  it('should return 403 when deleting another user grade item', async () => {
    prisma.gradeItem.findUnique.mockResolvedValue({
      id: gradeItemId,
      courseId,
      name: 'Midterm',
      score: 80,
      maxScore: 100,
      weightPercentage: 30,
      course: {
        id: courseId,
        coreUserId: 'user-002',
      },
    });

    await expect(
      service.deleteByOwner(gradeItemId, 'user-001'),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.gradeItem.delete).not.toHaveBeenCalled();
  });
});