import type { ScoreItem } from "./grade-calculation";

export interface TaskDraft {
  id: number;
  name: string;
  maxScore: string;
  score: string;
}

export interface TaskGroupDraft {
  totalMaxScore: string;
  weight: string;
  tasks: TaskDraft[];
}

export interface TaskAllocation {
  maxScore: number;
  estimated: boolean;
}

export interface TaskEstimateResult {
  allocations: TaskAllocation[] | null;
  error: string;
  knownTotal?: number;
  remaining?: number;
  unknownCount?: number;
  estimatedMaxScore?: number;
}

// The pool contains maximum marks, never marks earned by the student.
// Blank maximum marks are recomputed; estimates are not written into inputs.
export function estimateTaskMaxScores(totalMaxScore: number, knownMaxScores: (number | null)[]): TaskEstimateResult {
  if (!Number.isFinite(totalMaxScore) || totalMaxScore <= 0) {
    return { allocations: null, error: "กรุณากรอกคะแนนเต็มรวมที่มากกว่า 0" };
  }
  if (knownMaxScores.length === 0) {
    return { allocations: null, error: "กรุณาเพิ่มงานอย่างน้อย 1 งาน" };
  }
  if (knownMaxScores.some((score) => score !== null && (!Number.isFinite(score) || score <= 0))) {
    return { allocations: null, error: "คะแนนเต็มที่ทราบต้องมากกว่า 0 หรือเว้นว่างให้ระบบประมาณ" };
  }
  const knownTotal = knownMaxScores.reduce<number>((sum, score) => sum + (score ?? 0), 0);
  const unknownCount = knownMaxScores.filter((score) => score === null).length;
  const remaining = totalMaxScore - knownTotal;
  const tolerance = Number.EPSILON * Math.max(totalMaxScore, knownTotal, 1) * 16;
  if (remaining < -tolerance) {
    return { allocations: null, error: "คะแนนเต็มที่ทราบรวมกันเกินคะแนนเต็มรวม กรุณาตรวจสอบคะแนนของกลุ่มงาน" };
  }
  if (unknownCount > 0 && remaining <= tolerance) {
    return { allocations: null, error: "ไม่มีคะแนนเต็มเหลือให้ประมาณ กรุณาปรับคะแนนเต็มรวมหรือรายการงาน" };
  }
  if (unknownCount === 0 && Math.abs(remaining) > tolerance) {
    return { allocations: null, error: "คะแนนเต็มของทุกงานยังรวมไม่ตรงกับคะแนนเต็มรวม กรุณาปรับข้อมูลให้ตรงกัน" };
  }
  const estimatedMaxScore = unknownCount > 0 ? remaining / unknownCount : 0;
  const allocations: TaskAllocation[] = knownMaxScores.map((score) => ({
    maxScore: score ?? estimatedMaxScore,
    estimated: score === null,
  }));
  return { allocations, error: "", knownTotal, remaining: Math.max(0, remaining), unknownCount, estimatedMaxScore };
}

export function resolveTaskGroup(draft: TaskGroupDraft) {
  const active = draft.tasks.length > 0 || Boolean(draft.totalMaxScore.trim() || draft.weight.trim());
  const errors: Record<string, string> = {};
  if (!active) return { active, errors, allocation: null, calculationItems: [] as ScoreItem[], estimated: false };
  const total = Number(draft.totalMaxScore);
  const weight = Number(draft.weight);
  if (!draft.totalMaxScore.trim() || !Number.isFinite(total) || total <= 0) errors.totalMaxScore = "กรุณากรอกคะแนนเต็มรวมที่มากกว่า 0";
  if (!draft.weight.trim() || !Number.isFinite(weight) || weight < 0 || weight > 100) errors.weight = "กรุณากรอกน้ำหนักกลุ่มงานระหว่าง 0 ถึง 100% เพื่อคำนวณเกรด";
  for (const task of draft.tasks) {
    if (!task.name.trim()) errors[`${task.id}-name`] = "กรุณากรอกชื่องาน";
    if (task.maxScore.trim() && (!Number.isFinite(Number(task.maxScore)) || Number(task.maxScore) <= 0)) {
      errors[`${task.id}-maxScore`] = "คะแนนเต็มต้องมากกว่า 0 หรือเว้นว่างให้ระบบประมาณ";
    }
    if (task.score.trim() && (!Number.isFinite(Number(task.score)) || Number(task.score) < 0)) {
      errors[`${task.id}-score`] = "คะแนนที่ได้ต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป";
    }
  }
  const allocation = estimateTaskMaxScores(total, draft.tasks.map((task) => task.maxScore.trim() === "" ? null : Number(task.maxScore)));
  if (allocation.error) errors.allocation = allocation.error;
  const allocated = allocation.allocations;
  if (allocated) {
    draft.tasks.forEach((task, index) => {
      if (task.score.trim() && Number(task.score) > allocated[index].maxScore) {
        errors[`${task.id}-score`] = allocated[index].estimated
          ? "คะแนนที่ได้เกินคะแนนเต็มโดยประมาณ กรุณากรอกคะแนนเต็มจริงหรือปรับข้อมูลของกลุ่มงาน"
          : "คะแนนที่ได้ต้องไม่เกินคะแนนเต็มของงาน";
      }
    });
  }
  const calculationItems: ScoreItem[] | null = Object.keys(errors).length === 0 && allocated
    ? draft.tasks.map((task, index) => ({
      score: task.score.trim() === "" ? null : Number(task.score),
      maxScore: allocated[index].maxScore,
      // All tasks belong to one pool; each mark contributes equally within it.
      weight: allocated[index].maxScore / total * weight,
    }))
    : null;
  return { active, errors, allocation, calculationItems, estimated: allocated?.some((task) => task.estimated) ?? false };
}
