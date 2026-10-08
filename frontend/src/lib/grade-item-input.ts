import type { GradeItem } from "./api";

export type GradeItemForm = { name: string; score: string; maxScore: string; weightPercentage: string };
export type GradeItemInput = { name: string; score: number | null; maxScore: number; weightPercentage: number };
export const gradeItemLabels: Record<keyof GradeItemForm, string> = {
  name: "ชื่อรายการ", score: "คะแนนที่ได้", maxScore: "คะแนนเต็ม", weightPercentage: "น้ำหนัก (%)",
};
export const emptyGradeItem = (): GradeItemForm => ({ name: "", score: "", maxScore: "100", weightPercentage: "0" });

export function gradeItemForm(item: GradeItem): GradeItemForm {
  return { name: item.name, score: item.score == null ? "" : String(item.score), maxScore: String(item.maxScore), weightPercentage: String(item.weightPercentage) };
}

export function validateGradeItem(form: GradeItemForm, items: GradeItem[], editingId: string | null) {
  const errors: Partial<Record<keyof GradeItemForm, string>> = {};
  const numeric = (raw: string) => raw.trim() !== "" && Number.isFinite(Number(raw));
  const precision = (raw: string) => Math.abs(Number(raw) * 100 - Math.round(Number(raw) * 100)) < 0.000001;
  if (!form.name.trim()) errors.name = "กรุณากรอกชื่อรายการ";
  if (!numeric(form.maxScore) || Number(form.maxScore) <= 0 || Number(form.maxScore) > 99999999.99 || !precision(form.maxScore)) {
    errors.maxScore = "คะแนนเต็มต้องมากกว่า 0 และมีทศนิยมไม่เกิน 2 ตำแหน่ง";
  }
  if (form.score.trim() !== "" && (!numeric(form.score) || Number(form.score) < 0 || Number(form.score) > Number(form.maxScore) || !precision(form.score))) {
    errors.score = "คะแนนต้องอยู่ระหว่าง 0 ถึงคะแนนเต็ม และมีทศนิยมไม่เกิน 2 ตำแหน่ง";
  }
  if (!numeric(form.weightPercentage) || Number(form.weightPercentage) < 0 || Number(form.weightPercentage) > 100 || !precision(form.weightPercentage)) {
    errors.weightPercentage = "น้ำหนักต้องอยู่ระหว่าง 0 ถึง 100 และมีทศนิยมไม่เกิน 2 ตำแหน่ง";
  } else {
    const total = items.filter((item) => item.id !== editingId).reduce((sum, item) => sum + Number(item.weightPercentage), 0) + Number(form.weightPercentage);
    if (total > 100.000001) errors.weightPercentage = "น้ำหนักรวมของรายวิชาเกิน 100% กรุณาปรับน้ำหนักก่อนบันทึก";
  }
  return errors;
}

export function toGradeItemInput(form: GradeItemForm): GradeItemInput {
  return { name: form.name.trim(), score: form.score.trim() === "" ? null : Number(form.score), maxScore: Number(form.maxScore), weightPercentage: Number(form.weightPercentage) };
}
