"use client";

import { useEffect, useRef, useState } from "react";
import { AddIcon, DeleteIcon, ConfirmDeleteModal, StatusBadge, cardClass, inputClass, secondaryButtonClass } from "@/csmju";
import { actionClass, headingClass, EmptyState } from "@/components/page-states";
import { formatNumber } from "@/lib/format";
import { resolveTaskGroup } from "@/lib/task-estimation";
import type { TaskGroupDraft } from "@/lib/task-estimation";

type TaskField = "name" | "maxScore" | "score";
const taskLabels: Record<TaskField, string> = { name: "ชื่องาน", maxScore: "คะแนนเต็มที่อาจารย์แจ้ง", score: "คะแนนที่ได้" };

// Domain form composed from the shared classes, without changing src/csmju.
export default function TaskEstimator({ draft, onChange }: {
  draft: TaskGroupDraft;
  onChange: (next: TaskGroupDraft) => void;
}) {
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [removeId, setRemoveId] = useState<number | null>(null);
  const nextId = useRef(1);
  const result = resolveTaskGroup(draft);
  const allocation = result.allocation;
  const removing = draft.tasks.find((task) => task.id === removeId);

  useEffect(() => {
    if (removeId === null) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const buttons = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]') ?? []);
    buttons()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const targets = buttons(); const first = targets[0]; const last = targets[targets.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", trap);
    return () => { document.removeEventListener("keydown", trap); if (previous?.isConnected) previous.focus(); else document.getElementById("add-estimated-task")?.focus(); };
  }, [removeId]);

  function addTask() {
    const id = nextId.current++;
    onChange({ ...draft, tasks: [...draft.tasks, { id, name: `งาน ${id}`, maxScore: "", score: "" }] });
  }
  function editTask(id: number, field: TaskField, value: string) {
    onChange({ ...draft, tasks: draft.tasks.map((task) => task.id === id ? { ...task, [field]: value } : task) });
  }
  function touch(key: string) { setTouched((current) => ({ ...current, [key]: true })); }

  return <section aria-labelledby="task-estimator-title" className={`${cardClass} space-y-6 p-6`}>
    <div className="space-y-2">
      <h2 id="task-estimator-title" className={headingClass}>ประมาณคะแนนเต็มของงาน</h2>
      <p className="text-body-md text-on-surface-variant">ใช้กับงานกลุ่มเดียวกันที่ทราบคะแนนเต็มรวม แต่ยังไม่ทราบคะแนนเต็มของบางงาน ระบบแบ่งคะแนนที่เหลือเท่ากันให้ช่องที่เว้นว่าง และคำนวณใหม่ทุกครั้งที่เพิ่มหรือลบงาน</p>
      <p className="text-body-md text-on-surface-variant">ตัวอย่าง: เต็มรวม 60 มี 5 งาน รู้แล้ว 10 และ 20 คะแนน ที่เหลือ 3 งานจะประมาณงานละ 10 คะแนน</p>
      <StatusBadge tone="info" label="แบ่งคะแนนที่เหลือเท่ากัน" />
      <p className="text-body-md text-on-surface-variant">ส่วนนี้ประมาณคะแนนเต็มของงาน คะแนนที่ทำได้ให้กรอกตามที่ประกาศ หากยังไม่ประกาศให้เว้นว่าง</p>
    </div>
    <div className="space-y-4">
      {(["totalMaxScore", "weight"] as const).map((field) => {
        const key = `estimate-${field}`;
        const message = touched[field] ? result.errors[field] : "";
        return <div key={field} className="space-y-2">
          <label htmlFor={key} className="block text-label-md">{field === "totalMaxScore" ? "คะแนนเต็มรวมของกลุ่มงาน" : "น้ำหนักกลุ่มงานในรายวิชา (%)"} *</label>
          <input id={key} type="number" value={draft[field]} min={field === "totalMaxScore" ? "0.01" : "0"} max={field === "weight" ? "100" : undefined} step="any"
            required aria-required="true" onChange={(event) => onChange({ ...draft, [field]: event.target.value })} onBlur={() => touch(field)}
            aria-invalid={Boolean(message)} aria-describedby={`${key}-hint${message ? ` ${key}-error` : ""}`} className={`${inputClass} ${message ? "input-error" : ""}`} />
          <p id={`${key}-hint`} className="text-body-md text-on-surface-variant">{field === "totalMaxScore" ? "ช่องที่มี * จำเป็นต้องกรอกเมื่อใช้ส่วนประมาณคะแนน" : "ระบบคิดน้ำหนักแต่ละงานตามสัดส่วนคะแนนเต็มในกลุ่มนี้ อย่าเพิ่มงานกลุ่มเดียวกันซ้ำในรายการคะแนนด้านบน"}</p>
          {message && <p id={`${key}-error`} className="text-body-md text-error">{message}</p>}
        </div>;
      })}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-body-lg font-semibold">งานในกลุ่มนี้</h3>
      <button id="add-estimated-task" type="button" onClick={addTask} className={`${secondaryButtonClass} ${actionClass} inline-flex items-center gap-2`}><AddIcon className="h-4 w-4" />เพิ่มงาน</button>
    </div>
    {draft.tasks.length === 0 ? <EmptyState title="ยังไม่มีงานสำหรับประมาณ" description="เพิ่มงานทั้งหมดในกลุ่มนี้ ทั้งงานที่รู้และยังไม่รู้คะแนนเต็ม"><button type="button" onClick={addTask} className={`${secondaryButtonClass} ${actionClass}`}>เพิ่มงานแรก</button></EmptyState> : draft.tasks.map((task, index) => {
      const allocated = allocation?.allocations?.[index];
      return <fieldset key={task.id} className="min-w-0 space-y-4 rounded-lg border border-outline-variant p-4">
        <legend className="px-2 text-body-lg font-semibold">{task.name || "งาน"}</legend>
        {(Object.entries(taskLabels) as [TaskField, string][]).map(([field, label]) => {
          const errorKey = `${task.id}-${field}`; const key = `estimate-${errorKey}`;
          const message = touched[errorKey] || (field === "score" && touched["totalMaxScore"]) ? result.errors[errorKey] : "";
          const hint = field === "maxScore" ? "เว้นว่างให้ประมาณ กรอกคะแนนเต็มจริงเมื่อทราบแล้ว" : field === "score" ? "เว้นว่างหมายถึงยังไม่ทราบ ส่วน 0 หมายถึงได้ศูนย์คะแนน" : "";
          return <div key={field} className="space-y-2">
            <label htmlFor={key} className="block text-label-md">{label}{field === "name" ? " *" : " (เว้นว่างได้)"}</label>
            <input id={key} type={field === "name" ? "text" : "number"} value={task[field]} min={field === "maxScore" ? "0.01" : field === "score" ? "0" : undefined} step={field === "name" ? undefined : "any"}
              max={field === "score" ? allocated?.maxScore : undefined} required={field === "name"} aria-required={field === "name"}
              onChange={(event) => editTask(task.id, field, event.target.value)} onBlur={() => touch(errorKey)} aria-invalid={Boolean(message)}
              aria-describedby={[hint ? `${key}-hint` : "", message ? `${key}-error` : ""].filter(Boolean).join(" ") || undefined} className={`${inputClass} ${message ? "input-error" : ""}`} />
            {hint && <p id={`${key}-hint`} className="text-body-md text-on-surface-variant">{hint}</p>}
            {message && <p id={`${key}-error`} className="text-body-md text-error">{message}</p>}
          </div>;
        })}
        <div aria-live="polite" className="space-y-2">
          <StatusBadge tone={allocated?.estimated ? "warning" : allocated ? "info" : "neutral"} label={allocated?.estimated ? "คะแนนเต็มโดยประมาณ" : allocated ? "คะแนนเต็มที่ทราบ" : "รอข้อมูลคะแนนเต็มรวม"} />
          <p className="text-body-md tabular-nums">คะแนนเต็มที่ใช้คำนวณ: {allocated ? `${allocated.estimated ? "ประมาณ " : ""}${formatNumber(allocated.maxScore, 2)} คะแนน` : "—"}</p>
          {allocated && draft.weight.trim() && Number.isFinite(Number(draft.weight)) && Number(draft.weight) >= 0 && Number(draft.weight) <= 100 && <p className="text-body-md tabular-nums text-on-surface-variant">น้ำหนักตามสัดส่วนคะแนนเต็ม: {formatNumber(allocated.maxScore / Number(draft.totalMaxScore) * Number(draft.weight), 2)}%</p>}
        </div>
        <div className="flex justify-end"><button type="button" onClick={() => setRemoveId(task.id)} className={`${secondaryButtonClass} ${actionClass} inline-flex items-center gap-2`} aria-label={`ลบ ${task.name || "งาน"}`}><DeleteIcon className="h-4 w-4" />ลบ</button></div>
      </fieldset>;
    })}
    {draft.tasks.length > 0 && <div className="space-y-3" aria-live="polite">
      {allocation?.allocations ? <>
        <p className="text-body-md tabular-nums">ทราบคะแนนเต็มแล้ว {formatNumber(allocation.knownTotal ?? 0, 2)} จาก {formatNumber(Number(draft.totalMaxScore), 2)} คะแนน · ยังไม่ทราบ {formatNumber(allocation.unknownCount ?? 0)} งาน</p>
        {(allocation.unknownCount ?? 0) > 0 && <p className="text-body-md tabular-nums">คะแนนที่เหลือ {formatNumber(allocation.remaining ?? 0, 2)} ÷ {formatNumber(allocation.unknownCount ?? 0)} งาน = ประมาณ {formatNumber(allocation.estimatedMaxScore ?? 0, 2)} คะแนนต่องาน</p>}
        <p className="text-body-md text-on-surface-variant">ค่าประมาณจะปรับเองเมื่อเพิ่มงาน หรือเมื่อกรอกคะแนนเต็มจริงแทนช่องว่าง ตัวเลขที่แสดงปัดเพื่อให้อ่านง่าย การคำนวณใช้ค่าก่อนปัด</p>
      </> : <p role="alert" className="rounded-lg bg-error-container p-4 text-body-md text-on-error-container">{allocation?.error}</p>}
    </div>}
    {removing && <ConfirmDeleteModal title={`ลบ ${removing.name || "งาน"}?`} message="งานนี้จะถูกลบออกจากการคำนวณชั่วคราว และคะแนนเต็มโดยประมาณของงานที่เหลือจะเปลี่ยนตามจำนวนงาน" onClose={() => setRemoveId(null)} onConfirm={() => { onChange({ ...draft, tasks: draft.tasks.filter((task) => task.id !== removeId) }); setRemoveId(null); }} />}
  </section>;
}
