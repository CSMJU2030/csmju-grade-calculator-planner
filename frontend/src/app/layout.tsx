import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Noto_Sans_Thai } from "next/font/google";
import { CsmjuAppShell, type NavItem } from "@/csmju";
import SignInLink from "@/components/sign-in-link";
import { SessionProvider } from "@/components/session-context";
import { getCurrentUser } from "@/lib/server-user";
import { roleLabels } from "@/lib/user";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["400", "600", "700", "800"] });
const notoSansThai = Noto_Sans_Thai({ variable: "--font-noto-thai", subsets: ["latin", "thai"], weight: ["400", "500", "600", "700"] });
const DISPLAY_NAME = "ระบบคำนวณเกรด";
const INITIALS: Record<string, string> = { student: "นศ", staff: "บค", lecturer: "อจ", admin: "AD" };
const NAV: NavItem[] = [
  { label: "หน้าหลัก", href: "/", icon: "dashboard" },
  { label: "รายวิชา", href: "/courses", icon: "menu-book" },
  { label: "คำนวณเกรด", href: "/grade-calculator", icon: "school" },
  { label: "วางแผนเกรด", href: "/grade-planning", icon: "description" },
];

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: { template: `%s · ${DISPLAY_NAME} · CSMJU`, default: `${DISPLAY_NAME} · CSMJU` },
  description: "จัดการรายวิชา คำนวณคะแนน และวางแผนเกรดเป้าหมาย",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const roleLabel = user ? (roleLabels[user.coreRole] ?? "ผู้ใช้งาน") : "ยังไม่ได้เข้าสู่ระบบ";
  const initials = user ? (INITIALS[user.coreRole] ?? "CS") : "—";
  return (
    <html lang="th" className={`${jakarta.variable} ${notoSansThai.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-on-surface">
        <a href="#main" className="sr-only z-50 rounded-lg bg-surface-container-lowest p-4 text-primary-container focus:not-sr-only focus:fixed focus:left-4 focus:top-4">ข้ามไปยังเนื้อหาหลัก</a>
        <SessionProvider user={user} subsystemId={process.env.SUBSYSTEM_ID ?? ""}>
          <CsmjuAppShell displayName={DISPLAY_NAME} nav={NAV}
            coreHubUrl={process.env.CORE_HUB_WEB_URL}
            user={{ initials, roleLabel }}>
            {!user && <SignInLink />}
            {children}
          </CsmjuAppShell>
        </SessionProvider>
      </body>
    </html>
  );
}
