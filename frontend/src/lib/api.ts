export interface GradeItem {
  id: string;
  courseId: string;
  name: string;
  maxScore: number | string;
  weightPercentage: number | string;
  score?: number | string | null;
}

export interface Course {
  id: string;
  coreUserId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  gradeItems?: GradeItem[];
}

export interface CoursesResponse {
  success: boolean;
  data: Course[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface GradePlanning {
  courseId: string;
  courseCode: string;
  courseName: string;
  targetGrade: string;
  targetScore: number;
  currentWeightedScore: number;
  completedWeight: number;
  remainingWeight: number;
  requiredAverageOnRemaining: number | null;
  currentGrade: string;
}

export type ApiErrorCode = "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "CONFLICT" | "INTERNAL_ERROR" | "NETWORK_ERROR" | "RATE_LIMIT";

function errorCode(status: number): ApiErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 400 || status === 422) return "VALIDATION_ERROR";
  if (status === 409) return "CONFLICT";
  if (status === 429) return "RATE_LIMIT";
  if (status === 502 || status === 504) return "NETWORK_ERROR";
  return "INTERNAL_ERROR";
}

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  constructor(message: string, readonly status: number, readonly field?: string) {
    super(message);
    this.name = "ApiError";
    this.code = errorCode(status);
  }
}

const FIELD_MESSAGES: Record<string, string> = {
  courseCode: "กรุณากรอกรหัสวิชา",
  courseName: "กรุณากรอกชื่อวิชา",
  credits: "กรุณาระบุหน่วยกิตเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป",
};

function errorFromResponse(status: number, body: unknown): ApiError {
  const envelope = body as { error?: { code?: string; message?: unknown; details?: { field?: unknown } } } | null;
  const field = typeof envelope?.error?.details?.field === "string" ? envelope.error.details.field : undefined;
  if (status === 401) return new ApiError("", status);
  if (status === 403) return new ApiError("คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้", status);
  if (status === 404) return new ApiError("ไม่พบข้อมูลที่คุณกำลังค้นหา อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง", status);
  if (status === 409) return new ApiError("ข้อมูลถูกแก้ไขโดยผู้ใช้อื่นแล้ว กรุณารีเฟรชและลองใหม่", status);
  if (status === 429) return new ApiError("มีการใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่", status);
  if (status === 400 || status === 422) {
    const message = envelope?.error?.message;
    // API currently sends some default English validation text; never show it raw.
    const thaiMessage = typeof message === "string" && /[ก-๙]/.test(message) ? message : undefined;
    return new ApiError(thaiMessage ?? (field ? FIELD_MESSAGES[field] : undefined) ?? "กรุณาตรวจสอบข้อมูลที่กรอกแล้วลองอีกครั้ง", status, field);
  }
  if (status === 502 || status === 504) return new ApiError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง", status);
  return new ApiError("ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบ", status);
}

export async function requestApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, credentials: "same-origin", cache: "no-store" });
  let body;
  try { body = await response.json(); }
  catch { throw errorFromResponse(response.status || 502, null); }
  if (!response.ok || body?.success === false) throw errorFromResponse(response.status, body);
  return body as T;
}

export function getCourses(page = 1, signal?: AbortSignal) {
  return requestApi<CoursesResponse>(`/api/frontend/courses?page=${page}&limit=100`, { signal });
}

export async function getAllCourses(signal?: AbortSignal): Promise<Course[]> {
  const first = await getCourses(1, signal);
  const courses = [...first.data];
  for (let page = 2; page <= (first.meta?.totalPages ?? 1); page++) courses.push(...(await getCourses(page, signal)).data);
  return Array.from(new Map(courses.map((course) => [course.id, course])).values());
}

export async function createCourse(input: { courseCode: string; courseName: string; credits: number }): Promise<Course> {
  const body = await requestApi<{ success: boolean; data: Course }>("/api/frontend/courses", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
  });
  return body.data;
}

export async function getGradePlanning(courseId: string, targetGrade: string, signal?: AbortSignal): Promise<GradePlanning> {
  const body = await requestApi<{ success: boolean; data: GradePlanning }>(
    `/api/frontend/grade-planning?courseId=${encodeURIComponent(courseId)}&targetGrade=${encodeURIComponent(targetGrade)}`, { signal },
  );
  return body.data;
}

export function asApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง", 502);
}


export async function getGradeItems(courseId: string, signal?: AbortSignal): Promise<GradeItem[]> {
  const body = await requestApi<{ success: boolean; data: GradeItem[] }>(
    `/api/frontend/grade-items?courseId=${encodeURIComponent(courseId)}`, { signal },
  );
  return body.data;
}

export async function createGradeItem(courseId: string, input: import("./grade-item-input").GradeItemInput): Promise<GradeItem> {
  const body = await requestApi<{ success: boolean; data: GradeItem }>(
    `/api/frontend/grade-items?courseId=${encodeURIComponent(courseId)}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    },
  );
  return body.data;
}

export async function updateGradeItem(id: string, input: import("./grade-item-input").GradeItemInput): Promise<GradeItem> {
  const body = await requestApi<{ success: boolean; data: GradeItem }>(
    `/api/frontend/grade-items?id=${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input),
    },
  );
  return body.data;
}

export async function deleteGradeItem(id: string): Promise<void> {
  await requestApi(`/api/frontend/grade-items?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}
