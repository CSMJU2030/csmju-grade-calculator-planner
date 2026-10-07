"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { PageHeader, StatusBadge, primaryButtonClass, secondaryButtonClass, cardClass, inputClass, thClass, tdClass } from "@/csmju";
import ErrorNotice from "@/components/error-notice";
import { actionClass, headingClass, LoadingState, EmptyState } from "@/components/page-states";
import { useSession, useUnsavedChanges } from "@/components/session-context";
import { ApiError, asApiError, createCourse } from "@/lib/api";
import { useCourses } from "@/lib/use-courses";
import { formatNumber } from "@/lib/format";

const labels: Record<string, string> = { courseCode: "รหัสวิชา", courseName: "ชื่อวิชา", credits: "หน่วยกิต" };
const validate = (name: string, value: string) => {
  if (name === "credits") return value.trim() && Number.isInteger(Number(value)) && Number(value) >= 1 ? "" : "กรุณาระบุหน่วยกิตเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป";
  return value.trim() ? "" : `กรุณากรอก${labels[name]}`;
};

export default function CoursesPage() {
  const { courses, loading, error, reload } = useCourses();
  const { user } = useSession();
  const canCreate = user?.permissions.includes("course:create") ?? false;
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<ApiError | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [dirty, setDirty] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const pending = useRef(false);
  useUnsavedChanges(dirty);

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const values = { courseCode: String(data.get("courseCode") ?? "").trim(), courseName: String(data.get("courseName") ?? "").trim(), credits: String(data.get("credits") ?? "").trim() };
    const errors = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, validate(name, value)]));
    setFields(errors); setSuccess(""); setSubmitError(null);
    const first = Object.keys(errors).find((name) => errors[name]);
    if (first) { (form.elements.namedItem(first) as HTMLInputElement)?.focus(); return; }
    pending.current = true; setSubmitting(true);
    try {
      await createCourse({ ...values, credits: Number(values.credits) });
      form.reset(); setDirty(false); setFields({});
      setSuccess(`เพิ่มรายวิชา ${values.courseCode} สำเร็จแล้ว`); reload();
    } catch (failure) {
      const apiError = asApiError(failure);
      setSubmitError(apiError);
      if (apiError.field && Object.hasOwn(labels, apiError.field)) {
        setFields({ [apiError.field]: apiError.message });
        (form.elements.namedItem(apiError.field) as HTMLInputElement)?.focus();
      }
    } finally { pending.current = false; setSubmitting(false); }
  }

  const found = courses.filter((course) => `${course.courseCode} ${course.courseName}`.toLocaleLowerCase("th-TH").includes(query.trim().toLocaleLowerCase("th-TH")));
  const pages = Math.max(1, Math.ceil(found.length / 20));
  const currentPage = Math.min(page, pages);
  const visible = found.slice((currentPage - 1) * 20, currentPage * 20);

  return (
    <div className="space-y-8">
      <PageHeader title="รายวิชา" description="ดูรายวิชาของคุณและข้อมูลที่บันทึกไว้" />
      {success && <div role="status" className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest p-4"><StatusBadge tone="success" label="บันทึกสำเร็จ" /><p className="mt-2 text-body-md">{success}</p></div>}
      {canCreate && <form id="add-course" noValidate onSubmit={submit} onChange={() => setDirty(true)} className={`${cardClass} scroll-mt-20 space-y-4 p-6`}>
        <h2 className={headingClass}>เพิ่มรายวิชาใหม่</h2>
        <p className="text-body-md text-on-surface-variant">ช่องที่มี * จำเป็นต้องกรอก</p>
        {Object.entries(labels).map(([name, label]) => (
          <div key={name} className="space-y-2">
            <label htmlFor={`course-${name}`} className="block text-label-md">{label} *</label>
            <input id={`course-${name}`} name={name} type={name === "credits" ? "number" : "text"}
              required aria-required="true" min={name === "credits" ? 1 : undefined} step={name === "credits" ? 1 : undefined}
              defaultValue={name === "credits" ? "3" : undefined} readOnly={submitting}
              aria-invalid={Boolean(fields[name])} aria-describedby={fields[name] ? `error-${name}` : undefined}
              onBlur={(event) => setFields((current) => ({ ...current, [name]: validate(name, event.target.value) }))}
              className={`${inputClass} ${fields[name] ? "input-error" : ""}`} />
            {fields[name] && <p id={`error-${name}`} className="text-body-md text-error">{fields[name]}</p>}
          </div>
        ))}
        <p aria-live="polite" className="sr-only">{Object.values(fields).filter(Boolean).length ? `พบช่องที่ต้องแก้ไข ${formatNumber(Object.values(fields).filter(Boolean).length)} ช่อง` : ""}</p>
        {submitError && <ErrorNotice error={submitError} next="/courses" />}
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button type="reset" disabled={submitting} aria-describedby={submitting ? "course-saving" : undefined}
            onClick={() => { setFields({}); setSubmitError(null); setSuccess(""); setDirty(false); }} className={`${secondaryButtonClass} ${actionClass}`}>ยกเลิก</button>
          <button type="submit" disabled={submitting} aria-busy={submitting} aria-describedby={submitting ? "course-saving" : undefined} className={`${primaryButtonClass} ${actionClass}`}>{submitting ? "กำลังบันทึก..." : "บันทึก"}</button>
        </div>
        {submitting && <p id="course-saving" role="status" className="text-body-md text-on-surface-variant">กำลังบันทึกข้อมูล กรุณารอสักครู่</p>}
      </form>}
      <section className="space-y-4" aria-labelledby="course-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="course-list-title" className={headingClass}>รายวิชาของฉัน</h2><button type="button" onClick={reload} disabled={loading} aria-describedby={loading ? "course-list-loading" : undefined} className={`${secondaryButtonClass} ${actionClass}`}>โหลดใหม่</button></div>
        {loading && <span id="course-list-loading" className="sr-only">กำลังโหลดข้อมูล...</span>}
        {error ? <ErrorNotice error={error} next="/courses" retry={reload} /> : loading ? <LoadingState /> : courses.length === 0 ? (
          <EmptyState title="ยังไม่มีรายวิชา" description={canCreate ? "เพิ่มรายวิชาแรกด้วยฟอร์มด้านบน" : "ยังไม่มีรายวิชาของบัญชีนี้ กรุณาติดต่อผู้ดูแลระบบย่อย"} href={canCreate ? "#add-course" : "/"} action={canCreate ? "เพิ่มรายวิชา" : "กลับหน้าหลัก"} />
        ) : <div className={cardClass}>
          <div className="space-y-2 border-b border-outline-variant/40 px-6 py-5">
            <label htmlFor="course-search" className="block text-label-md">ค้นหารายวิชา</label>
            <input id="course-search" type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className={inputClass} />
          </div>
          {found.length === 0 ? <EmptyState title="ค้นหาแล้วไม่พบรายวิชา" description="ลองใช้คำค้นอื่น หรือล้างตัวกรอง"><button type="button" onClick={() => { setQuery(""); setPage(1); }} className={`${secondaryButtonClass} ${actionClass}`}>ล้างตัวกรอง</button></EmptyState> : <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-body-md">
                <caption className="sr-only">รายวิชาของฉัน</caption>
                <thead><tr className="border-b border-outline-variant/40 bg-surface text-label-md text-on-surface-variant">
                  {["รหัสวิชา", "ชื่อวิชา", "หน่วยกิต", "รายการคะแนน", "จัดการ"].map((label) => <th key={label} scope="col" className={thClass}>{label}</th>)}
                </tr></thead>
                <tbody>{visible.map((course) => <tr key={course.id} className="border-b border-outline-variant/40 hover:bg-surface/50 last:border-0">
                  <td className={`${tdClass} whitespace-nowrap font-medium`}>{course.courseCode}</td><td className={tdClass}>{course.courseName}</td>
                  <td className={`${tdClass} tabular-nums`}>{formatNumber(course.credits)}</td><td className={`${tdClass} tabular-nums`}>{formatNumber(course.gradeItems?.length ?? 0)}</td>
                  <td className={tdClass}><Link href={`/grade-planning?courseId=${encodeURIComponent(course.id)}`} className={`${actionClass} inline-flex items-center whitespace-nowrap text-primary-container hover:underline`}>วางแผนเกรด</Link></td>
                </tr>)}</tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/40 p-6">
              <p className="text-body-md tabular-nums text-on-surface-variant">หน้า {formatNumber(currentPage)} จาก {formatNumber(pages)} · {formatNumber(found.length)} รายวิชา</p>
              <div className="flex gap-3">
                <button type="button" disabled={currentPage <= 1} aria-label="รายวิชาหน้าก่อนหน้า" aria-describedby={currentPage <= 1 ? "course-page-first" : undefined} onClick={() => setPage(currentPage - 1)} className={`${secondaryButtonClass} ${actionClass}`}>ก่อนหน้า</button>
                <button type="button" disabled={currentPage >= pages} aria-label="รายวิชาหน้าถัดไป" aria-describedby={currentPage >= pages ? "course-page-last" : undefined} onClick={() => setPage(currentPage + 1)} className={`${secondaryButtonClass} ${actionClass}`}>ถัดไป</button>
              </div>
              <span id="course-page-first" className="sr-only">อยู่หน้าแรกแล้ว</span><span id="course-page-last" className="sr-only">อยู่หน้าสุดท้ายแล้ว</span>
            </div>
          </>}
        </div>}
      </section>
    </div>
  );
}
