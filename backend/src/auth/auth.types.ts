export type CoreRole =
  | 'student'
  | 'alumni'
  | 'staff'
  | 'lecturer'
  | 'guest'
  | 'admin';

export interface AuthUser {
  sub: string;
  email: string;
  role: CoreRole;
  sid: string;
  iat?: number;
  exp?: number;
}