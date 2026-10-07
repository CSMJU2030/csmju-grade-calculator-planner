"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { primaryButtonClass } from "@/csmju";
import { actionClass } from "./page-states";

export default function SignInLink() {
  const pathname = usePathname() ?? "/";
  const [query, setQuery] = useState("");
  useEffect(() => { Promise.resolve().then(() => setQuery(window.location.search)); }, [pathname]);
  return <a href={`/auth/login?next=${encodeURIComponent(pathname + query)}`} className={`${primaryButtonClass} ${actionClass} w-fit`}>เข้าสู่ระบบผ่าน Core Hub</a>;
}
