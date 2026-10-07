"use client";

import { useEffect, useState } from "react";
import { primaryButtonClass, cardClass } from "@/csmju";
import { useSession } from "./session-context";
import { actionClass } from "./page-states";

// auth-contract §7: navigate the whole browser, never fetch or mint/refresh a token.
export default function ReSignIn({ next }: { next: string }) {
  const { subsystemId, hasDraft } = useSession();
  const [href, setHref] = useState(`/auth/login?next=${encodeURIComponent(next)}`);
  useEffect(() => {
    const landing = window.location.pathname + window.location.search;
    const target = `/auth/login?next=${encodeURIComponent(landing)}`;
    const key = `${subsystemId}:last-sign-in-navigation`;
    let recent = true;
    try {
      const time = Number(sessionStorage.getItem(key));
      const elapsed = Date.now() - time;
      recent = time > 0 && elapsed >= 0 && elapsed < 30_000;
      if (!hasDraft() && !recent) {
        sessionStorage.setItem(key, String(Date.now())); // Timestamp only, no token.
        window.location.replace(target);
        return;
      }
    } catch {
      // Storage unavailable: let the user choose, preventing a redirect loop.
    }
    Promise.resolve().then(() => setHref(target));
  }, [subsystemId, hasDraft]);
  return (
    <div className={`${cardClass} space-y-4 p-6`}>
      <p className="text-body-md text-on-surface-variant">เข้าสู่ระบบอีกครั้งเพื่อใช้งานต่อ หากมีข้อมูลที่ยังไม่บันทึก ให้ตรวจสอบก่อนออกจากหน้านี้</p>
      <a href={href} className={`${primaryButtonClass} ${actionClass} w-fit`}>เข้าสู่ระบบอีกครั้ง</a>
    </div>
  );
}
