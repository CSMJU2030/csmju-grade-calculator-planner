"use client";

import { cardClass, primaryButtonClass } from "@/csmju";
import { actionClass } from "@/components/page-states";

export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <div role="alert" className={`${cardClass} space-y-4 p-6 text-center`}>
    <h1 className="font-display text-headline-md">ระบบขัดข้องชั่วคราว</h1>
    <p className="text-body-md text-on-surface-variant">กรุณาลองอีกครั้ง หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบ{error.digest && <> พร้อมรหัส: <span className="tabular-nums">{error.digest}</span></>}</p>
    <button type="button" onClick={retry} className={`${primaryButtonClass} ${actionClass} mx-auto`}>ลองอีกครั้ง</button>
  </div>;
}
