import { headers } from "next/headers";
import type { CurrentUser } from "./user";

// Server-side request to this subsystem only; never expose cookies or tokens in props.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const baseUrl = (process.env.BACKEND_URL ?? "http://127.0.0.1:4214").replace(/\/+$/, "");
  const cookie = (await headers()).get("cookie");
  if (!cookie) return null;
  try {
    const response = await fetch(`${baseUrl}/api/v1/me`, {
      headers: { Accept: "application/json", Cookie: cookie },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    const user = body?.data;
    if (body?.success !== true || typeof user?.id !== "string" || typeof user?.coreRole !== "string") return null;
    return {
      id: user.id,
      coreRole: user.coreRole,
      subsystemRole: typeof user.subsystemRole === "string" ? user.subsystemRole : "",
      permissions: Array.isArray(user.permissions) ? user.permissions.filter((p: unknown) => typeof p === "string") : [],
      session: { expiresAt: typeof user.session?.expiresAt === "string" ? user.session.expiresAt : null },
    };
  } catch {
    return null;
  }
}
