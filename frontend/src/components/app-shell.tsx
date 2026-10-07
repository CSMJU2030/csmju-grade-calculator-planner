import type { ReactNode } from "react";

/** Compatibility wrapper; the shared shell is rendered once by app/layout.tsx. */
export default function AppShell({ children }: { active: string; children: ReactNode }) {
  return <div className="min-w-0 space-y-8">{children}</div>;
}
