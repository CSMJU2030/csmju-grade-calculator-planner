import { SubsystemRole } from './role-mapping';

export enum Permission {
  COURSE_READ_OWN = 'course:read:own',
  COURSE_CREATE = 'course:create',
  COURSE_UPDATE = 'course:update',
  COURSE_DELETE = 'course:delete',

  GRADE_ITEM_READ_OWN = 'grade_item:read:own',
  GRADE_ITEM_CREATE_OWN = 'grade_item:create:own',
  GRADE_ITEM_UPDATE_OWN = 'grade_item:update:own',
  GRADE_ITEM_DELETE_OWN = 'grade_item:delete:own',

  GRADE_PLANNING_READ_OWN = 'grade_planning:read:own',
}

export const ROLE_PERMISSIONS: Record<SubsystemRole, Permission[]> = {
  STUDENT: [
    Permission.COURSE_READ_OWN,
    Permission.GRADE_ITEM_READ_OWN,
    Permission.GRADE_ITEM_CREATE_OWN,
    Permission.GRADE_ITEM_UPDATE_OWN,
    Permission.GRADE_ITEM_DELETE_OWN,
    Permission.GRADE_PLANNING_READ_OWN,
  ],

  STAFF: [
    Permission.COURSE_READ_OWN,
    Permission.COURSE_CREATE,
    Permission.COURSE_UPDATE,

    Permission.GRADE_ITEM_READ_OWN,
    Permission.GRADE_ITEM_CREATE_OWN,
    Permission.GRADE_ITEM_UPDATE_OWN,
    Permission.GRADE_ITEM_DELETE_OWN,
    Permission.GRADE_PLANNING_READ_OWN,
  ],

  ADMIN: [
    Permission.COURSE_READ_OWN,
    Permission.COURSE_CREATE,
    Permission.COURSE_UPDATE,
    Permission.COURSE_DELETE,

    Permission.GRADE_ITEM_READ_OWN,
    Permission.GRADE_ITEM_CREATE_OWN,
    Permission.GRADE_ITEM_UPDATE_OWN,
    Permission.GRADE_ITEM_DELETE_OWN,
    Permission.GRADE_PLANNING_READ_OWN,
  ],
};