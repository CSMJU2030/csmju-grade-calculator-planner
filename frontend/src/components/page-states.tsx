import Link from "next/link";
import type { ReactNode } from "react";
import { cardClass, secondaryButtonClass, MenuBookIcon } from "@/csmju";

// Temporary domain components composed from @/csmju classes and tokens (UI §17.0).
export const actionClass = "min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40";
export const headingClass = "font-display text-headline-md text-on-surface";

export function LoadingState({ cards = false }: { cards?: boolean }) {
  return (
    <div role="status" aria-busy="true" className={cards ? "grid gap-6 md:grid-cols-3" : cardClass}>
      <span className="sr-only">กำลังโหลดข้อมูล...</span>
      {Array.from({ length: cards ? 3 : 4 }, (_, index) => (
        <div key={index} className={cards ? `${cardClass} space-y-4 p-6` : "space-y-3 border-b border-outline-variant/40 p-6 last:border-0"}>
          <div className="h-5 w-1/2 animate-pulse rounded-lg bg-surface-container motion-reduce:animate-none" />
          <div className="h-8 w-3/4 animate-pulse rounded-lg bg-surface-container motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description, href = "/courses", action = "ดูรายวิชา", children }: {
  title: string; description: string; href?: string; action?: string; children?: ReactNode;
}) {
  return (
    <div className={`${cardClass} space-y-4 px-6 py-12 text-center`}>
      <MenuBookIcon className="mx-auto h-6 w-6 text-primary-container" />
      <h2 className={headingClass}>{title}</h2>
      <p className="text-body-md text-on-surface-variant">{description}</p>
      {children ?? <Link href={href} className={`${secondaryButtonClass} ${actionClass} inline-flex items-center`}>{action}</Link>}
    </div>
  );
}
