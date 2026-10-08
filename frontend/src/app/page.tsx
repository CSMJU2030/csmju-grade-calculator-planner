import type { Metadata } from "next";
import Content from "@/components/features/home";

export const metadata: Metadata = { title: "หน้าหลัก" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <Content />;
}
