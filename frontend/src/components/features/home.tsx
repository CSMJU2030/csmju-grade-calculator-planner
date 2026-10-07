"use client";

import Link from "next/link";
import { PageHeader, cardClass, secondaryButtonClass, MenuBookIcon, SchoolIcon, DescriptionIcon } from "@/csmju";
import ErrorNotice from "@/components/error-notice";
import { LoadingState, EmptyState, actionClass, headingClass } from "@/components/page-states";
import { useSession } from "@/components/session-context";
import { useCourses } from "@/lib/use-courses";
import { formatNumber } from "@/lib/format";

export default function Home() {
  const { courses, loading, error, reload } = useCourses();
  const { user } = useSession();
  const canCreate = user?.permissions.includes("course:create") ?? false;
  const stats = [
    { label: "รายวิชา", value: courses.length, note: "จำนวนรายวิชาทั้งหมด", Icon: MenuBookIcon },
    { label: "รายการคะแนน", value: courses.reduce((sum, course) => sum + (course.gradeItems?.length ?? 0), 0), note: "รายการที่บันทึกไว้ในรายวิชา", Icon: DescriptionIcon },
    { label: "หน่วยกิต", value: courses.reduce((sum, course) => sum + course.credits, 0), note: "หน่วยกิตของรายวิชาทั้งหมด", Icon: SchoolIcon },
  ];
  return (
    <div className="space-y-8">
      <PageHeader title="หน้าหลัก" description="จัดการรายวิชา คำนวณคะแนน และวางแผนเกรดเป้าหมาย" />
      {error ? <ErrorNotice error={error} next="/" retry={reload} /> : loading ? <LoadingState cards /> : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            {stats.map(({ label, value, note, Icon }) => (
              <div key={label} className={`${cardClass} p-6`}>
                <div className="flex items-center justify-between gap-3"><p className="text-label-md text-on-surface-variant">{label}</p><Icon className="h-5 w-5 text-primary-container" /></div>
                <p className="mt-4 font-display text-display-lg tabular-nums text-primary-container">{formatNumber(value)}</p>
                <p className="mt-2 text-body-md text-on-surface-variant">{note}</p>
              </div>
            ))}
          </div>
          {courses.length === 0 && <EmptyState title="ยังไม่มีรายวิชา" description={canCreate ? "เริ่มต้นด้วยการเพิ่มรายวิชาแรก" : "ยังไม่มีรายวิชาของบัญชีนี้ กรุณาติดต่อผู้ดูแลระบบย่อย"} href={canCreate ? "/courses#add-course" : "/courses"} action={canCreate ? "เพิ่มรายวิชา" : "ดูรายวิชา"} />}
        </>
      )}
      <div className={`${cardClass} space-y-4 p-6`}>
        <h2 className={headingClass}>เมนูด่วน</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/courses" className={`${secondaryButtonClass} ${actionClass} inline-flex items-center`}>ดูรายวิชา</Link>
          <Link href="/grade-calculator" className={`${secondaryButtonClass} ${actionClass} inline-flex items-center`}>คำนวณเกรด</Link>
          <Link href="/grade-planning" className={`${secondaryButtonClass} ${actionClass} inline-flex items-center`}>วางแผนเกรด</Link>
        </div>
      </div>
    </div>
  );
}
