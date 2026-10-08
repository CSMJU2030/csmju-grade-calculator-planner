import { apiError, proxyBackend } from "@/lib/backend";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const courseId = params.get("courseId") ?? "";
  const targetGrade = params.get("targetGrade") ?? "";
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(courseId) || !["A", "B+", "B", "C+", "C", "D+", "D"].includes(targetGrade)) {
    return apiError("เลือกรายวิชาและเกรดเป้าหมายให้ถูกต้อง", 400);
  }
  return proxyBackend(
    request,
    `/api/v1/courses/${encodeURIComponent(courseId)}/grade-planning?targetGrade=${encodeURIComponent(targetGrade)}`,
  );
}
