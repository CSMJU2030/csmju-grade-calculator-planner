"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ConfirmDeleteModal, StatusBadge, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/csmju";
import { actionClass, headingClass, EmptyState, LoadingState } from "@/components/page-states";
import ErrorNotice from "@/components/error-notice";
import { useSession, useUnsavedChanges } from "@/components/session-context";
import { asApiError, getGradeItems, createGradeItem, updateGradeItem, deleteGradeItem, type ApiError, type GradeItem } from "@/lib/api";
import { useCourses } from "@/lib/use-courses";
import { emptyGradeItem, gradeItemForm, gradeItemLabels, validateGradeItem, toGradeItemInput, type GradeItemForm } from "@/lib/grade-item-input";
import { calculateGrade, gradeScale } from "@/lib/grade-calculation";
import { formatNumber } from "@/lib/format";

export default function SavedGradeItems({ initialCourseId }: { initialCourseId: string }) {
  const { courses, loading, error, reload } = useCourses();
  const { user } = useSession();
  const permission = (name: string) => user?.permissions.includes(name) ?? false;
  const [chosenId, setChosenId] = useState(initialCourseId);
  const courseId = courses.some((course) => course.id === chosenId) ? chosenId : (courses[0]?.id ?? "");
  const [revision, setRevision] = useState(0);
  const key = `${courseId}:${revision}`;
  const [loaded, setLoaded] = useState<{ key: string; items: GradeItem[]; error: ApiError | null } | null>(null);
  const items = loaded?.key === key ? loaded.items : [];
  const itemError = loaded?.key === key ? loaded.error : null;
  const fetching = Boolean(courseId) && loaded?.key !== key;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GradeItemForm>(emptyGradeItem);
  const [fields, setFields] = useState<Partial<Record<keyof GradeItemForm, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState("");
  const [remove, setRemove] = useState<GradeItem | null>(null);
  const [target, setTarget] = useState("A");
  const formRef = useRef<HTMLFormElement>(null);
  useUnsavedChanges(dirty);

  useEffect(() => {
    if (!courseId || loading || error) return;
    const controller = new AbortController();
    void getGradeItems(courseId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setLoaded({ key, items: data, error: null });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setLoaded({ key, items: [], error: asApiError(cause) });
    });
    return () => controller.abort();
  }, [courseId, key, loading, error]);
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 4000);
    return () => window.clearTimeout(timer);
  }, [success]);
  useEffect(() => {
    if (!remove) return;
    const previous = document.activeElement as HTMLElement | null;
    const fallback = formRef.current;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const targets = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]') ?? []);
    targets()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const list = targets(); const first = list[0]; const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.removeEventListener("keydown", trap); if (previous?.isConnected) previous.focus(); else fallback?.querySelector<HTMLInputElement>("input")?.focus(); };
  }, [remove]);

  function reset() { setForm(emptyGradeItem()); setEditingId(null); setFields({}); setDirty(false); setFailure(null); }
  function canDiscard() { return !dirty || window.confirm("มีข้อมูลที่ยังไม่ได้บันทึก ต้องการทิ้งการแก้ไขหรือไม่?"); }
  function choose(id: string) {
    if (locked.current || !canDiscard()) return;
    reset(); setSuccess(""); setRemove(null); setChosenId(id);
  }
  function edit(item: GradeItem) {
    if (locked.current || !canDiscard()) return;
    setEditingId(item.id); setForm(gradeItemForm(item)); setFields({}); setFailure(null); setDirty(false);
    formRef.current?.scrollIntoView({ block: "start" });
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || fetching || itemError || !courseId) return;
    const errors = validateGradeItem(form, items, editingId);
    setFields(errors); setFailure(null); setSuccess("");
    const first = Object.keys(errors)[0];
    if (first) { (formRef.current?.elements.namedItem(first) as HTMLInputElement | null)?.focus(); return; }
    locked.current = true; setBusy(true);
    try {
      const input = toGradeItemInput(form);
      const saved = editingId ? await updateGradeItem(editingId, input) : await createGradeItem(courseId, input);
      // Commit local state only after the database acknowledges the write.
      const next = editingId ? items.map((item) => item.id === editingId ? saved : item) : [...items, saved];
      setLoaded({ key, items: next, error: null });
      reset(); setSuccess("บันทึกรายการคะแนนสำเร็จแล้ว");
    } catch (cause) { setFailure(asApiError(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  async function confirmDelete() {
    if (locked.current || !remove) return;
    locked.current = true; setBusy(true); setFailure(null); setSuccess("");
    try {
      await deleteGradeItem(remove.id);
      setLoaded({ key, items: items.filter((item) => item.id !== remove.id), error: null });
      if (editingId === remove.id) reset();
      setRemove(null); setSuccess("ลบรายการคะแนนสำเร็จแล้ว");
    } catch (cause) { setRemove(null); setFailure(asApiError(cause)); }
    finally { locked.current = false; setBusy(false); }
  }
  const summary = calculateGrade(items.map((item) => ({ score: item.score == null ? null : Number(item.score), maxScore: Number(item.maxScore), weight: Number(item.weightPercentage) })), target);
  const canWrite = editingId ? permission("grade_item:update:own") : permission("grade_item:create:own");

  return <section aria-labelledby="saved-scores-title" className="space-y-6">
    <div className="space-y-2"><h2 id="saved-scores-title" className={headingClass}>คะแนนที่บันทึกในรายวิชา</h2>
      <p className="text-body-md text-on-surface-variant">เลือกวิชาแล้วเพิ่มหรือแก้ไขคะแนน ข้อมูลส่วนนี้บันทึกลงฐานข้อมูลและใช้ร่วมกับหน้าวางแผนเกรด เว้นคะแนนว่างเมื่อยังไม่ประกาศ ส่วน 0 หมายถึงได้ศูนย์คะแนน</p></div>
    {error ? <ErrorNotice error={error} next="/grade-calculator" retry={reload} /> : loading ? <LoadingState /> : !courseId ? <EmptyState title="ยังไม่มีรายวิชา" description="ต้องมีรายวิชาของบัญชีนี้ก่อนบันทึกคะแนน" /> : <>
      <div className={`${cardClass} space-y-4 p-6`}>
        <label htmlFor="saved-course" className="block text-label-md">รายวิชา</label>
        <select id="saved-course" value={courseId} onChange={(event) => choose(event.target.value)} disabled={busy} aria-describedby={busy ? "saved-busy" : undefined} className={inputClass}>
          {courses.map((course) => <option key={course.id} value={course.id}>{course.courseCode} — {course.courseName}</option>)}
        </select>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy || fetching} aria-describedby="saved-reload-hint" onClick={() => { if (canDiscard()) { reset(); setRevision((value) => value + 1); } }} className={`${secondaryButtonClass} ${actionClass}`}>โหลดใหม่</button>
          <Link href={`/grade-planning?courseId=${encodeURIComponent(courseId)}`} className={`${secondaryButtonClass} ${actionClass} inline-flex items-center`}>วางแผนเกรดวิชานี้</Link>
        </div><p id="saved-reload-hint" className="text-body-md text-on-surface-variant">โหลดใหม่หลังแก้ไขจากหน้าหรืออุปกรณ์อื่น ปุ่มใช้ได้เมื่อโหลดหรือบันทึกเสร็จแล้ว</p>
      </div>
      {success && <div role="status" className={`${cardClass} space-y-2 p-4`}><StatusBadge tone="success" label="สำเร็จ" /><p className="text-body-md">{success}</p></div>}
      {failure && <ErrorNotice error={failure} next="/grade-calculator" />}
      {busy && <p id="saved-busy" role="status" className="text-body-md text-on-surface-variant">กำลังบันทึกข้อมูล กรุณารอสักครู่</p>}
      {itemError ? <ErrorNotice error={itemError} next="/grade-calculator" retry={() => setRevision((value) => value + 1)} /> : fetching ? <LoadingState /> : <>
        {canWrite && <form ref={formRef} onSubmit={(event) => { void submit(event); }} noValidate className={`${cardClass} scroll-mt-20 space-y-4 p-6`}>
          <h3 className="text-body-lg font-semibold">{editingId ? "แก้ไขรายการคะแนน" : "เพิ่มรายการคะแนน"}</h3>
          <p className="text-body-md text-on-surface-variant">ช่องที่มี * จำเป็นต้องกรอก · ตัวเลขรองรับทศนิยมไม่เกิน 2 ตำแหน่ง</p>
          {(Object.entries(gradeItemLabels) as [keyof GradeItemForm, string][]).map(([field, label]) => <div key={field} className="space-y-2">
            <label htmlFor={`saved-${field}`} className="block text-label-md">{label}{field === "score" ? " (เว้นว่างได้)" : " *"}</label>
            <input id={`saved-${field}`} name={field} value={form[field]} type={field === "name" ? "text" : "number"} step={field === "name" ? undefined : "0.01"}
              min={field === "maxScore" ? "0.01" : field === "name" ? undefined : "0"} max={field === "weightPercentage" ? "100" : field === "score" ? form.maxScore : undefined}
              required={field !== "score"} aria-required={field !== "score"} readOnly={busy}
              onChange={(event) => { setForm((current) => ({ ...current, [field]: event.target.value })); setDirty(true); }}
              onBlur={() => setFields((current) => ({ ...current, [field]: validateGradeItem(form, items, editingId)[field] }))}
              aria-invalid={Boolean(fields[field])} aria-describedby={fields[field] ? `saved-${field}-error` : undefined} className={`${inputClass} ${fields[field] ? "input-error" : ""}`} />
            {fields[field] && <p id={`saved-${field}-error`} className="text-body-md text-error">{fields[field]}</p>}
          </div>)}
          <p aria-live="polite" className="sr-only">{Object.values(fields).filter(Boolean).length ? `พบช่องที่ต้องแก้ไข ${formatNumber(Object.values(fields).filter(Boolean).length)} ช่อง` : ""}</p>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" disabled={busy} aria-describedby={busy ? "saved-busy" : undefined} onClick={() => { if (canDiscard()) reset(); }} className={`${secondaryButtonClass} ${actionClass}`}>ยกเลิก</button>
            <button type="submit" disabled={busy} aria-busy={busy} aria-describedby={busy ? "saved-busy" : undefined} className={`${primaryButtonClass} ${actionClass}`}>{busy ? "กำลังบันทึก..." : "บันทึก"}</button>
          </div>
        </form>}
        {items.length === 0 ? <EmptyState title="ยังไม่มีรายการคะแนนที่บันทึก" description={permission("grade_item:create:own") ? "เพิ่มรายการแรกด้วยฟอร์มด้านบน" : "ยังไม่มีรายการคะแนนในรายวิชานี้"} /> : <div className="space-y-4">
          {items.map((item) => <article key={item.id} className={`${cardClass} space-y-4 p-6`}>
            <h3 className="break-words text-body-lg font-semibold">{item.name}</h3>
            <p className="text-body-md tabular-nums">คะแนน {item.score == null ? "ยังไม่ประกาศ" : formatNumber(Number(item.score), 2)} / {formatNumber(Number(item.maxScore), 2)} · น้ำหนัก {formatNumber(Number(item.weightPercentage), 2)}%</p>
            <div className="flex flex-wrap justify-end gap-3">
              {permission("grade_item:update:own") && <button type="button" disabled={busy} aria-describedby={busy ? "saved-busy" : undefined} aria-label={`แก้ไข ${item.name}`} onClick={() => edit(item)} className={`${secondaryButtonClass} ${actionClass}`}>แก้ไข</button>}
              {permission("grade_item:delete:own") && <button type="button" disabled={busy} aria-describedby={busy ? "saved-busy" : undefined} aria-label={`ลบ ${item.name}`} onClick={() => { if (canDiscard()) { reset(); setRemove(item); } }} className={`${secondaryButtonClass} ${actionClass}`}>ลบ</button>}
            </div>
          </article>)}
        </div>}
        {items.length > 0 && <div className={`${cardClass} space-y-4 p-6`}>
          <h3 className="text-body-lg font-semibold">ผลจากคะแนนที่บันทึกแล้ว</h3>
          <label htmlFor="saved-target" className="block text-label-md">เกรดเป้าหมาย</label>
          <select id="saved-target" value={target} onChange={(event) => setTarget(event.target.value)} className={inputClass}>{gradeScale.filter((row) => row.grade !== "F").map((row) => <option key={row.grade} value={row.grade}>{row.grade}</option>)}</select>
          {summary ? <>
            <p className="text-body-md tabular-nums">คะแนนสะสม {formatNumber(summary.currentWeightedScore, 2)} · เกรดตามคะแนนสะสม {summary.currentGrade} · น้ำหนักรวม {formatNumber(summary.totalWeight, 2)}%</p>
            <p className="text-body-md tabular-nums">ส่วนที่ยังไม่ทราบคะแนน {formatNumber(summary.remainingWeight, 2)}% · ต้องทำเฉลี่ย {summary.requiredAverage === null ? "—" : `${formatNumber(summary.requiredAverage, 2)}%`}</p>
            <StatusBadge tone={summary.reached ? "success" : summary.possible ? "info" : "warning"} label={summary.reached ? "ถึงเป้าหมายแล้ว" : summary.possible ? "ยังมีโอกาสถึงเป้าหมาย" : "คะแนนไม่เพียงพอ"} />
            <p className="text-body-md text-on-surface-variant">เกรดตามคะแนนสะสมยังไม่ใช่เกรดสุดท้ายจนกว่าจะทราบคะแนนครบและกำหนดน้ำหนักครบ 100% น้ำหนักที่ยังไม่ได้กำหนดนับเป็นส่วนที่ยังไม่ทราบคะแนน</p>
          </> : <p role="alert" className="text-body-md text-error">ข้อมูลคะแนนเดิมไม่ถูกต้องหรือน้ำหนักรวมเกิน 100% กรุณาแก้ไขรายการก่อนอ่านผลคำนวณ</p>}
        </div>}
      </>}
    </>}
    {remove && <ConfirmDeleteModal title={`ลบ ${remove.name}?`} message="รายการคะแนนนี้จะถูกลบถาวร และผลคำนวณกับแผนเกรดของวิชานี้จะเปลี่ยนตามข้อมูลที่เหลือ" blockedReason={busy ? "กำลังลบข้อมูล กรุณารอสักครู่" : undefined} onClose={() => { if (!locked.current) setRemove(null); }} onConfirm={() => { void confirmDelete(); }} />}
  </section>;
}
