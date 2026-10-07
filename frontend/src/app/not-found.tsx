import Link from "next/link";
import { MenuBookIcon, cardClass, secondaryButtonClass } from "@/csmju";
import { actionClass } from "@/components/page-states";

export default function NotFound() {
  return <div className={`${cardClass} space-y-4 p-6 text-center`}>
    <MenuBookIcon className="mx-auto h-6 w-6 text-primary-container" />
    <h1 className="font-display text-headline-md">ไม่พบหน้าที่คุณกำลังค้นหา</h1>
    <p className="text-body-md text-on-surface-variant">อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง</p>
    <Link href="/" className={`${secondaryButtonClass} ${actionClass} inline-flex items-center`}>กลับหน้าหลัก</Link>
  </div>;
}
