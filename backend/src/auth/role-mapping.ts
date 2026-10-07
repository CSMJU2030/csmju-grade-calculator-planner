import type { CoreRole } from './auth.types';

export type SubsystemRole = 'STUDENT' | 'STAFF' | 'ADMIN';

// G0: alumni and guest are not mapped and must receive 403.
export const CORE_ROLE_TO_SUBSYSTEM_ROLE: Partial<Record<CoreRole, SubsystemRole>> = {
  student: 'STUDENT',
  staff: 'STAFF',
  lecturer: 'STAFF',
  admin: 'ADMIN',
};
