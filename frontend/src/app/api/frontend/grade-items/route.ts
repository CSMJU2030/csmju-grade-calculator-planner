import { apiError, isSameOrigin, proxyBackend } from "@/lib/backend";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  const courseId = new URL(request.url).searchParams.get("courseId") ?? "";
  if (!uuid.test(courseId)) return apiError("เลือกรายวิชาให้ถูกต้อง", 400);
  return proxyBackend(request, `/api/v1/courses/${courseId}/grade-items`);
}

async function write(request: Request, method: "POST" | "PATCH") {
  if (!isSameOrigin(request)) return apiError("ไม่อนุญาตคำขอจากเว็บไซต์อื่น", 403);
  const params = new URL(request.url).searchParams;
  const id = params.get(method === "POST" ? "courseId" : "id") ?? "";
  if (!uuid.test(id)) return apiError("รายการคะแนนหรือรายวิชาไม่ถูกต้อง", 400);
  let body: unknown;
  try { body = await request.json(); } catch { return apiError("ข้อมูลคะแนนไม่ถูกต้อง", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return apiError("ข้อมูลคะแนนไม่ถูกต้อง", 400);
  const value = body as Record<string, unknown>;
  if (typeof value.name !== "string" || !value.name.trim() ||
      typeof value.maxScore !== "number" || !Number.isFinite(value.maxScore) || value.maxScore <= 0 ||
      typeof value.weightPercentage !== "number" || !Number.isFinite(value.weightPercentage) || value.weightPercentage < 0 || value.weightPercentage > 100 ||
      (value.score !== null && (typeof value.score !== "number" || !Number.isFinite(value.score) || value.score < 0 || value.score > value.maxScore))) {
    return apiError("ตรวจชื่อรายการ คะแนนเต็ม คะแนนที่ได้ และน้ำหนักให้ถูกต้อง", 400);
  }
  const path = method === "POST" ? `/api/v1/courses/${id}/grade-items` : `/api/v1/grade-items/${id}`;
  return proxyBackend(request, path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({
    name: value.name.trim(), score: value.score, maxScore: value.maxScore, weightPercentage: value.weightPercentage,
  }) });
}

export function POST(request: Request) { return write(request, "POST"); }
export function PATCH(request: Request) { return write(request, "PATCH"); }
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return apiError("ไม่อนุญาตคำขอจากเว็บไซต์อื่น", 403);
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!uuid.test(id)) return apiError("รายการคะแนนไม่ถูกต้อง", 400);
  return proxyBackend(request, `/api/v1/grade-items/${id}`, { method: "DELETE" });
}
