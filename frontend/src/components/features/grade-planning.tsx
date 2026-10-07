"use client";

import { useEffect, useState } from "react";
import { PageHeader, StatusBadge, cardClass, inputClass } from "@/csmju";
import { LoadingState, EmptyState } from "@/components/page-states";
import { formatNumber } from "@/lib/format";
import ErrorNotice from "@/components/error-notice";
import { asApiError, getGradePlanning, type ApiError, type GradePlanning } from "@/lib/api";
import { useCourses } from "@/lib/use-courses";

const grades = ["A", "B+", "B", "C+", "C", "D+", "D"];

export default function GradePlanningPage({ initialCourseId }: { initialCourseId: string }) {
  const { courses, loading, error, reload } = useCourses();
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [targetGrade, setTargetGrade] = useState("A");
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ key: string; planning: GradePlanning | null; error: ApiError | null } | null>(null);

  const preferredId = chosenId ?? initialCourseId;
  const courseId = courses.some((course) => course.id === preferredId) ? preferredId : (courses[0]?.id ?? "");
  const key = `${courseId}:${targetGrade}:${revision}`;

  useEffect(() => {
    if (!courseId || loading || error) return;
    const controller = new AbortController();
    void getGradePlanning(courseId, targetGrade, controller.signal)
      .then((planning) => {
        if (!controller.signal.aborted) setResult({ key, planning, error: null });
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) setResult({ key, planning: null, error: asApiError(failure) });
      });
    return () => controller.abort();
  }, [courseId, targetGrade, key, loading, error]);

  const planning = result?.key === key ? result.planning : null;
  const planningError = result?.key === key ? result.error : null;
  const pending = Boolean(courseId) && result?.key !== key;
  const targetReached = planning ? planning.currentWeightedScore >= planning.targetScore : false;
  const possible = planning ? targetReached || (planning.remainingWeight > 0 && planning.requiredAverageOnRemaining !== null && planning.requiredAverageOnRemaining <= 100) : false;

  return (
    <div className="space-y-8">
      <PageHeader title="วางแผนเกรด" description="เลือกวิชาและเกรดเป้าหมายเพื่อคำนวณจากคะแนนที่บันทึกไว้" />
      <div className="mt-8">
        {error ? <ErrorNotice error={error} next="/grade-planning" retry={reload} /> : loading ? (
          <LoadingState />
        ) : courses.length === 0 ? (
          <EmptyState title="ยังไม่มีรายวิชา" description="ต้องมีรายวิชาของบัญชีนี้ก่อนเริ่มวางแผนเกรด" href="/courses" action="ดูรายวิชา" />
        ) : (
          <>
            <div className={`${cardClass} grid gap-6 p-6 md:grid-cols-2`}>
              <label className="text-body-md font-medium">รายวิชา
                <select value={courseId} onChange={(event) => setChosenId(event.target.value)} className={`${inputClass} mt-2`}>
                  {courses.map((course) => <option key={course.id} value={course.id}>{course.courseCode} — {course.courseName}</option>)}
                </select>
              </label>
              <label className="text-body-md font-medium">เกรดเป้าหมาย
                <select value={targetGrade} onChange={(event) => setTargetGrade(event.target.value)} className={`${inputClass} mt-2`}>
                  {grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-6">
              {planningError ? <ErrorNotice error={planningError} next="/grade-planning" retry={() => setRevision((value) => value + 1)} /> : pending ? (
                <LoadingState cards />
              ) : planning ? (
                <>
                  <div className="grid gap-6 md:grid-cols-3">
                    {[
                      { label: "คะแนนสะสม", value: formatNumber(planning.currentWeightedScore, 2), note: `เกรดตามคะแนนสะสม: ${planning.currentGrade}` },
                      { label: "เกรดเป้าหมาย", value: planning.targetGrade, note: `ต้องได้ ${formatNumber(planning.targetScore)} คะแนน` },
                      { label: "น้ำหนักที่เหลือ", value: `${formatNumber(planning.remainingWeight, 2)}%`, note: `ทราบคะแนนแล้ว ${formatNumber(planning.completedWeight, 2)}%` },
                    ].map((stat) => <div key={stat.label} className={`${cardClass} p-6`}><p className="text-body-md text-on-surface-variant">{stat.label}</p><p className="mt-2 font-display text-headline-lg tabular-nums">{stat.value}</p><p className="mt-2 text-body-md text-on-surface-variant">{stat.note}</p></div>)}
                  </div>
                  <div className={`${cardClass} mt-6 p-6`}>
                    <h2 className="font-display text-headline-md">คะแนนเฉลี่ยที่ต้องทำในส่วนที่เหลือ</h2>
                    <p className="mt-3 font-display text-headline-lg tabular-nums">{planning.requiredAverageOnRemaining === null ? "—" : `${formatNumber(planning.requiredAverageOnRemaining, 2)}%`}</p>
                    <StatusBadge tone={targetReached ? "success" : possible ? "info" : "warning"} label={targetReached ? "ถึงเป้าหมายแล้ว" : possible ? "ยังมีโอกาสถึงเป้าหมาย" : "คะแนนไม่เพียงพอ"} />
                    <p className="mt-5 rounded-lg bg-surface p-4 text-body-md text-on-surface-variant">
                      {targetReached ? "คะแนนสะสมถึงเกรดเป้าหมายแล้ว" : planning.remainingWeight <= 0 ? "ไม่มีน้ำหนักคะแนนเหลือ และคะแนนยังไม่ถึงเป้าหมาย" : planning.requiredAverageOnRemaining === null ? "ยังไม่มีข้อมูลเพียงพอสำหรับคำนวณคะแนนที่ต้องทำ" : possible ? "ยังมีโอกาสถึงเกรดเป้าหมาย หากทำคะแนนส่วนที่เหลือได้ตามที่คำนวณ" : "คะแนนส่วนที่เหลือยังไม่เพียงพอที่จะถึงเกรดเป้าหมายนี้"}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
