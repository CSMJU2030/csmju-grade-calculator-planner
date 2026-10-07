// ใช้เฉพาะใน Route Handlers: session อยู่ใน HttpOnly cookie เสมอ
export async function proxyBackend(
  request: Request,
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const baseUrl = (
    process.env.BACKEND_URL ??
    "http://127.0.0.1:3002"
  ).replace(/\/+$/, "");

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("Cookie", cookie);

  try {
    const upstream = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
    const body: unknown = await upstream.json();
    return Response.json(body, {
      status: upstream.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return apiError("เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", 502);
  }
}

export function apiError(message: string, status: number): Response {
  return Response.json(
    { success: false, error: { message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export function isSameOrigin(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const host = request.headers.get("host") ?? new URL(request.url).host;
    return ["http:", "https:"].includes(source.protocol) && source.host === host;
  } catch {
    return false;
  }
}
