export interface CurrentUser {
  id: string;
  coreRole: string;
  subsystemRole: string;
  permissions: string[];
  session: { expiresAt: string | null };
}

export const roleLabels: Record<string, string> = {
  student: "นักศึกษา",
  staff: "บุคลากร/อาจารย์",
  lecturer: "บุคลากร/อาจารย์",
  admin: "ผู้ดูแลระบบ",
};
