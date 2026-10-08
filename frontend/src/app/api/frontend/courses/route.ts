import { apiError, isSameOrigin, proxyBackend } from "@/lib/backend";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? "1");
  const limit = Number(params.get("limit") ?? "100");
  if (!Number.isInteger(page) || page < 1 ||
      !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return apiError("เลขหน้าและจำนวนรายวิชาไม่ถูกต้อง", 400);
  }
  return proxyBackend(request, `/api/v1/courses?page=${page}&limit=${limit}`);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return apiError("ไม่อนุญาตคำขอจากเว็บไซต์อื่น", 403);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("ข้อมูลรายวิชาไม่ถูกต้อง", 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return apiError("ข้อมูลรายวิชาไม่ถูกต้อง", 400);
  }
  const input = body as Record<string, unknown>;
  if (typeof input.courseCode !== "string" || !input.courseCode.trim() ||
      typeof input.courseName !== "string" || !input.courseName.trim() ||
      typeof input.credits !== "number" || !Number.isInteger(input.credits) ||
      input.credits < 1) {
    return apiError("กรอกรหัสวิชา ชื่อวิชา และหน่วยกิตเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป", 400);
  }
  // Backend เป็นผู้ระบุเจ้าของจาก session ไม่รับ user ID จากฟอร์ม
  return proxyBackend(request, "/api/v1/courses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      courseCode: input.courseCode.trim(),
      courseName: input.courseName.trim(),
      credits: input.credits,
    }),
  });
}
