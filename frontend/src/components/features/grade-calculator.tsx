"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader, ConfirmDeleteModal, StatusBadge, AddIcon, DeleteIcon, cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from "@/csmju";
import { actionClass, headingClass, EmptyState } from "@/components/page-states";
import { useUnsavedChanges } from "@/components/session-context";
import { calculateGrade, gradeScale } from "@/lib/grade-calculation";
import { formatNumber } from "@/lib/format";
import SavedGradeItems from "@/components/features/saved-grade-items";
import TaskEstimator from "@/components/features/task-estimator";
import { resolveTaskGroup } from "@/lib/task-estimation";
import type { TaskGroupDraft } from "@/lib/task-estimation";

type Draft = { id: number; name: string; score: string; maxScore: string; weight: string };
type Field = Exclude<keyof Draft, "id">;
const labels: Record<Field, string> = { name: "ชื่อรายการ", score: "คะแนนที่ได้", maxScore: "คะแนนเต็ม", weight: "น้ำหนัก (%)" };

function fieldError(item: Draft, field: Field): string {
  if (field === "name") return item.name.trim() ? "" : "กรุณากรอกชื่อรายการ";
  const raw = item[field];
  if (field === "score" && raw.trim() === "") return "";
  const value = Number(raw);
  if (!raw.trim() || !Number.isFinite(value)) return "กรุณากรอกตัวเลข";
  if (field === "maxScore") return value > 0 ? "" : "คะแนนเต็มต้องมากกว่า 0";
  if (field === "weight") return value >= 0 && value <= 100 ? "" : "น้ำหนักต้องอยู่ระหว่าง 0 ถึง 100";
  return value >= 0 && value <= Number(item.maxScore) ? "" : "คะแนนต้องอยู่ระหว่าง 0 ถึงคะแนนเต็ม";
}

export default function GradeCalculatorPage({ initialCourseId }: { initialCourseId: string }) {
  const [items, setItems] = useState<Draft[]>([]);
  const [taskGroup, setTaskGroup] = useState<TaskGroupDraft>({ totalMaxScore: "", weight: "", tasks: [] });
  const [targetGrade, setTargetGrade] = useState("A");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [removeId, setRemoveId] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const nextId = useRef(1);
  useUnsavedChanges(dirty);
  const removing = items.find((item) => item.id === removeId);

  // Compose focus trapping around the unmodified shared confirmation modal.
  useEffect(() => {
    if (removeId === null) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const buttons = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]') ?? []);
    buttons()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const targets = buttons();
      const first = targets[0]; const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.removeEventListener("keydown", trap); if (previous?.isConnected) previous.focus(); else document.getElementById("add-score-item")?.focus(); };
  }, [removeId]);

  const estimation = useMemo(() => resolveTaskGroup(taskGroup), [taskGroup]);
  const valid = items.every((item) => Object.keys(labels).every((field) => !fieldError(item, field as Field))) && estimation.calculationItems !== null;
  const result = useMemo(() => estimation.calculationItems === null ? null : calculateGrade([...items.map((item) => ({
    score: item.score.trim() === "" ? null : Number(item.score), maxScore: Number(item.maxScore), weight: Number(item.weight),
  })), ...estimation.calculationItems], targetGrade), [items, targetGrade, estimation]);
  const summary = valid ? result : null;
  const totalWeight = items.reduce((sum, item) => sum + Number(item.weight || 0), 0) + (estimation.active ? Number(taskGroup.weight || 0) : 0);
  const hasInputs = items.length > 0 || estimation.active;

  function addItem() {
    setDirty(true);
    const id = nextId.current++;
    setItems((current) => [...current, { id, name: `รายการคะแนน ${id}`, score: "", maxScore: "100", weight: "0" }]);
  }
  function update(id: number, field: Field, value: string) {
    setDirty(true);
    setItems((current) => current.map((item) => item.id === id ? { ...item, [field]: value } : item));
  }

  return <div className="space-y-8">
    <PageHeader title="คำนวณเกรด" description="บันทึกคะแนนรายวิชา คำนวณคะแนนถ่วงน้ำหนัก และทดลองเกรดเป้าหมาย" />
    <SavedGradeItems initialCourseId={initialCourseId} />
    <h2 className={headingClass}>ทดลองคำนวณและประมาณคะแนน</h2>
    <div className={`${cardClass} space-y-2 p-6`}>
      <StatusBadge tone="info" label="คำนวณชั่วคราว" />
      <p className="text-body-md text-on-surface-variant">ข้อมูลในหน้านี้ยังไม่บันทึกลงรายวิชา และจะหายเมื่อโหลดหน้าใหม่ ช่องคะแนนที่เว้นว่างหมายถึงยังไม่ทราบคะแนน ส่วน 0 หมายถึงทราบแล้วว่าได้ศูนย์คะแนน</p>
    </div>
    <section className="space-y-6" aria-labelledby="score-items-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="score-items-title" className={headingClass}>รายการคะแนน</h2>
        <button id="add-score-item" type="button" onClick={addItem} className={`${primaryButtonClass} ${actionClass}`}><AddIcon className="h-4 w-4" />เพิ่มรายการ</button>
      </div>
      {items.length === 0 ? <EmptyState title="ยังไม่มีรายการคะแนน" description="เพิ่มรายการแรก แล้วกรอกคะแนนเต็มและน้ำหนักตามเกณฑ์ของรายวิชา"><button type="button" onClick={addItem} className={`${secondaryButtonClass} ${actionClass}`}>เพิ่มรายการแรก</button></EmptyState> : items.map((item) => <div key={item.id} className={`${cardClass} space-y-4 p-6`}>
        <h3 className="text-body-lg font-semibold">{item.name || "รายการคะแนน"}</h3>
        <p className="text-body-md text-on-surface-variant">ช่องที่มี * จำเป็นต้องกรอก</p>
        {(Object.entries(labels) as [Field, string][]).map(([field, label]) => {
          const key = `${item.id}-${field}`;
          const message = touched[key] ? fieldError(item, field) : "";
          return <div key={field} className="space-y-2">
            <label htmlFor={key} className="block text-label-md">{label}{field !== "score" ? " *" : " (เว้นว่างได้)"}</label>
            <input id={key} type={field === "name" ? "text" : "number"} value={item[field]}
              min={field === "maxScore" ? "0.01" : field === "name" ? undefined : "0"} step={field === "name" ? undefined : "any"}
              max={field === "weight" ? "100" : field === "score" ? item.maxScore : undefined}
              required={field !== "score"} aria-required={field !== "score"}
              onChange={(event) => update(item.id, field, event.target.value)}
              onBlur={() => setTouched((current) => ({ ...current, [key]: true }))}
              aria-invalid={Boolean(message)} aria-describedby={message ? `${key}-error` : undefined}
              className={`${inputClass} ${message ? "input-error" : ""}`} />
            {message && <p id={`${key}-error`} className="text-body-md text-error">{message}</p>}
          </div>;
        })}
        <div className="flex justify-end">
          <button type="button" aria-label={`ลบ ${item.name || "รายการคะแนน"}`} onClick={() => setRemoveId(item.id)} className={`${secondaryButtonClass} ${actionClass} inline-flex items-center gap-2`}><DeleteIcon className="h-4 w-4" />ลบ</button>
        </div>
      </div>)}
    </section>
    <TaskEstimator draft={taskGroup} onChange={(next) => { setTaskGroup(next); setDirty(true); }} />
    {hasInputs && <>
      {(!valid || !result) && <p role="alert" className="rounded-lg bg-error-container p-4 text-body-md text-on-error-container">{Number.isFinite(totalWeight) && totalWeight > 100 ? "น้ำหนักคะแนนรวมเกิน 100% กรุณาปรับน้ำหนักรายการคะแนนและกลุ่มงาน" : Object.values(estimation.errors)[0] || "กรุณาตรวจสอบข้อมูลคะแนนก่อนอ่านผลคำนวณ"}</p>}
      {estimation.estimated && summary && <div className={`${cardClass} space-y-2 p-6`} role="status"><StatusBadge tone="warning" label="ผลเกรดโดยประมาณ" /><p className="text-body-md text-on-surface-variant">ผลนี้ใช้คะแนนเต็มโดยประมาณของบางงาน และคิดน้ำหนักงานตามสัดส่วนคะแนนเต็มในกลุ่ม เมื่อทราบคะแนนเต็มจริงให้กรอกแทนช่องว่าง ผลคำนวณจะเปลี่ยนตามข้อมูลใหม่</p></div>}
      <div className="grid gap-6 md:grid-cols-3" aria-live="polite">
        {[
          { label: estimation.estimated ? "คะแนนสะสมโดยประมาณ" : "คะแนนสะสม", value: summary ? formatNumber(summary.currentWeightedScore, 2) : "—" },
          { label: estimation.estimated ? "เกรดตามคะแนนสะสมโดยประมาณ" : "เกรดตามคะแนนสะสม", value: summary?.currentGrade ?? "—" },
          { label: "น้ำหนักรวม", value: summary ? `${formatNumber(summary.totalWeight, 2)}%` : "—" },
        ].map((stat) => <div key={stat.label} className={`${cardClass} p-6`}><p className="text-label-md text-on-surface-variant">{stat.label}</p><p className="mt-4 font-display text-headline-lg tabular-nums text-primary-container">{stat.value}</p></div>)}
      </div>
      <div className={`${cardClass} space-y-4 p-6`}>
        <h2 className={headingClass}>วิเคราะห์เกรดเป้าหมาย</h2>
        <label htmlFor="target-grade" className="block text-label-md">เกรดเป้าหมาย</label>
        <select id="target-grade" value={targetGrade} onChange={(event) => setTargetGrade(event.target.value)} className={inputClass}>
          {gradeScale.map((row) => <option key={row.grade} value={row.grade}>{row.grade} — {formatNumber(row.minimum)} คะแนน</option>)}
        </select>
        {summary && <div aria-live="polite" className="space-y-4">
          <p className="text-body-md tabular-nums text-on-surface-variant">น้ำหนักที่ยังไม่ทราบคะแนน {formatNumber(summary.remainingWeight, 2)}% · คะแนนเฉลี่ยที่ต้องทำ {summary.requiredAverage === null ? "—" : `${formatNumber(summary.requiredAverage, 2)}%`}</p>
          <StatusBadge tone={summary.reached ? "success" : summary.possible ? "info" : "warning"} label={summary.reached ? "ถึงเป้าหมายแล้ว" : summary.possible ? "ยังมีโอกาสถึงเป้าหมาย" : "คะแนนไม่เพียงพอ"} />
          <p className="text-body-md text-on-surface-variant">{summary.reached ? "คะแนนสะสมถึงเกรดเป้าหมายแล้ว" : summary.remainingWeight <= 0 ? "ไม่มีน้ำหนักคะแนนเหลือ และคะแนนยังไม่ถึงเป้าหมาย" : summary.possible ? "ทำคะแนนส่วนที่เหลือให้ได้ตามค่าเฉลี่ยที่คำนวณ" : "แม้ได้คะแนนเต็มในส่วนที่เหลือก็ยังไม่ถึงเกรดเป้าหมายนี้"}</p>
          {summary.totalWeight < 100 && <p className="text-body-md text-on-surface-variant">น้ำหนักรายการยังไม่ครบ 100% การวิเคราะห์นี้ถือว่าน้ำหนักที่ยังไม่ได้กำหนดเป็นคะแนนที่ยังไม่ทราบ</p>}
        </div>}
      </div>
    </>}
    {removing && <ConfirmDeleteModal title={`ลบ ${removing.name || "รายการคะแนน"}?`} message="รายการนี้จะถูกลบออกจากการคำนวณชั่วคราวในหน้านี้" onClose={() => setRemoveId(null)} onConfirm={() => {
      setItems((current) => current.filter((item) => item.id !== removeId)); setDirty(true); setRemoveId(null);
    }} />}
  </div>;
}
