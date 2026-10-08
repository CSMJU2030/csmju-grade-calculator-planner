"use client";

import Link from "next/link";
import { cardClass, secondaryButtonClass } from "@/csmju";
import type { ApiError } from "@/lib/api";
import ReSignIn from "./re-sign-in";
import { actionClass, EmptyState } from "./page-states";

export default function ErrorNotice({ error, next, retry }: {
  error: ApiError; next: string; retry?: () => void;
}) {
  if (error.code === "UNAUTHORIZED") return <ReSignIn next={next} />;
  if (error.code === "NOT_FOUND") return <EmptyState title="ไม่พบข้อมูลที่คุณกำลังค้นหา" description="อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง" href="/" action="กลับหน้าหลัก" />;
  if (error.code === "FORBIDDEN") return (
    <div role="alert" className={`${cardClass} space-y-4 p-6`}>
      <p className="text-body-md text-on-surface-variant">คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้</p>
      <Link href="/" className={`${secondaryButtonClass} ${actionClass} inline-flex items-center`}>กลับหน้าหลัก</Link>
    </div>
  );
  return (
    <div role="alert" className="space-y-4 rounded-lg bg-error-container p-6 text-on-error-container">
      <p className="text-body-md">{error.message}</p>
      {retry && <button type="button" onClick={retry} className={`${secondaryButtonClass} ${actionClass}`}>ลองอีกครั้ง</button>}
    </div>
  );
}
