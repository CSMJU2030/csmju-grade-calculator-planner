import type { Metadata } from "next";
import Content from "@/components/features/grade-calculator";

export const metadata: Metadata = { title: "คำนวณเกรด" };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: {
  searchParams: Promise<{ courseId?: string | string[] }>;
}) {
  const value = (await searchParams).courseId;
  const courseId = typeof value === "string" ? value : "";
  return <Content key={courseId} initialCourseId={courseId} />;
}
