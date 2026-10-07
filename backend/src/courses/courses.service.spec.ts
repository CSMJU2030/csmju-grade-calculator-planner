import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { CoursesService } from './courses.service';

describe('CoursesService', () => {
  let service: CoursesService;

  const prisma = {
    course: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const courseId = '11111111-1111-4111-8111-111111111111';
  const missingCourseId = '99999999-9999-4999-8999-999999999999';

  beforeEach(() => {
    jest.resetAllMocks();

    // จำลอง transaction แบบ array สำหรับ unit test เท่านั้น
    prisma.$transaction.mockImplementation(
      (queries: Promise<unknown>[]) => Promise.all(queries),
    );

    service = new CoursesService(
      prisma as unknown as PrismaService,
    );
  });

  describe('findAllByOwner', () => {
    it('should return owned courses with pagination metadata', async () => {
      const courses = [
        {
          id: courseId,
          coreUserId: 'user-001',
          courseCode: 'CSMJU2030',
          courseName: 'Senior Full-Stack',
          credits: 3,
          gradeItems: [],
        },
      ];

      prisma.course.findMany.mockResolvedValue(courses);
      prisma.course.count.mockResolvedValue(1);

      const result = await service.findAllByOwner('user-001');

      expect(result).toEqual({
        data: courses,
        meta: {
          total: 1,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });

      expect(prisma.course.findMany).toHaveBeenCalledWith({
        where: { coreUserId: 'user-001' },
        include: { gradeItems: true },
        orderBy: { id: 'asc' },
        skip: 0,
        take: 10,
      });

      expect(prisma.course.count).toHaveBeenCalledWith({
        where: { coreUserId: 'user-001' },
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should paginate and count using the same owner filter', async () => {
      prisma.course.findMany.mockResolvedValue([]);
      prisma.course.count.mockResolvedValue(12);

      const result = await service.findAllByOwner(
        'user-001',
        2,
        5,
      );

      expect(result).toEqual({
        data: [],
        meta: {
          total: 12,
          page: 2,
          limit: 5,
          totalPages: 3,
        },
      });

      expect(prisma.course.findMany).toHaveBeenCalledWith({
        where: { coreUserId: 'user-001' },
        include: { gradeItems: true },
        orderBy: { id: 'asc' },
        skip: 5,
        take: 5,
      });

      expect(prisma.course.count).toHaveBeenCalledWith({
        where: { coreUserId: 'user-001' },
      });
    });
  });

  describe('findOneByOwner', () => {
    it('should return an owned course', async () => {
      const course = {
        id: courseId,
        coreUserId: 'user-001',
        courseCode: 'CSMJU2030',
        courseName: 'Senior Full-Stack',
        credits: 3,
        gradeItems: [],
      };

      prisma.course.findUnique.mockResolvedValue(course);

      const result = await service.findOneByOwner(
        courseId,
        'user-001',
      );

      expect(result).toEqual(course);
    });

    it('should throw 403 when the course belongs to another user', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: courseId,
        coreUserId: 'user-002',
        courseCode: 'CSMJU2030',
        courseName: 'Senior Full-Stack',
        credits: 3,
        gradeItems: [],
      });

      await expect(
        service.findOneByOwner(courseId, 'user-001'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should throw 404 when the course does not exist', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.findOneByOwner(missingCourseId, 'user-001'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a course using the token user as owner', async () => {
      const course = {
        id: courseId,
        coreUserId: 'user-001',
        courseCode: 'CSMJU2030',
        courseName: 'Senior Full-Stack',
        credits: 3,
        gradeItems: [],
      };

      prisma.course.create.mockResolvedValue(course);

      const result = await service.create('user-001', {
        courseCode: 'CSMJU2030',
        courseName: 'Senior Full-Stack',
        credits: 3,
      });

      expect(result).toEqual(course);
      expect(prisma.course.create).toHaveBeenCalledWith({
        data: {
          coreUserId: 'user-001',
          courseCode: 'CSMJU2030',
          courseName: 'Senior Full-Stack',
          credits: 3,
        },
        include: { gradeItems: true },
      });
    });
  });

  describe('updateByOwner', () => {
    it('should update an owned course', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: courseId,
        coreUserId: 'user-001',
      });

      const updatedCourse = {
        id: courseId,
        coreUserId: 'user-001',
        courseCode: 'CSMJU2030',
        courseName: 'Updated Course',
        credits: 3,
        gradeItems: [],
      };

      prisma.course.update.mockResolvedValue(updatedCourse);

      const result = await service.updateByOwner(
        courseId,
        'user-001',
        { courseName: 'Updated Course' },
      );

      expect(result).toEqual(updatedCourse);
    });

    it('should throw 403 when updating another user course', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: courseId,
        coreUserId: 'user-002',
      });

      await expect(
        service.updateByOwner(courseId, 'user-001', {
          courseName: 'Hacked Course',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.course.update).not.toHaveBeenCalled();
    });

    it('should throw 404 when updating a missing course', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.updateByOwner(missingCourseId, 'user-001', {
          courseName: 'Test',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteByOwner', () => {
    it('should delete an existing course', async () => {
      prisma.course.findUnique.mockResolvedValue({
        id: courseId,
        coreUserId: 'user-001',
      });

      prisma.course.delete.mockResolvedValue({ id: courseId });

      const result = await service.deleteByOwner(courseId, 'user-001');

      expect(result).toEqual({
        id: courseId,
        deleted: true,
      });

      expect(prisma.course.delete).toHaveBeenCalledWith({
        where: { id: courseId },
      });
    });

    it('should not delete a course owned by another user', async () => {
      prisma.course.findUnique.mockResolvedValue({ id: courseId, coreUserId: 'user-002' });
      await expect(service.deleteByOwner(courseId, 'user-001'))
        .rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.course.delete).not.toHaveBeenCalled();
    });

    it('should throw 404 when deleting a missing course', async () => {
      prisma.course.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteByOwner(missingCourseId, 'user-001'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.course.delete).not.toHaveBeenCalled();
    });
  });
});