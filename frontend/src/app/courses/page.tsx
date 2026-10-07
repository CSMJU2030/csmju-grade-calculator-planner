import type { Metadata } from "next";
import Content from "@/components/features/courses";

export const metadata: Metadata = { title: "รายวิชา" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <Content />;
}
