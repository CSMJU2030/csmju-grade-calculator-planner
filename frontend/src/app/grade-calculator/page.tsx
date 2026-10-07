import type { Metadata } from "next";
import Content from "@/components/features/grade-calculator";

export const metadata: Metadata = { title: "คำนวณเกรด" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <Content />;
}
