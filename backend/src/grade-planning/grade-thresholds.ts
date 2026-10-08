export const GRADE_THRESHOLDS = {
  A: 80,
  'B+': 75,
  B: 70,
  'C+': 65,
  C: 60,
  'D+': 55,
  D: 50,
  F: 0,
} as const;

export type TargetGrade = keyof typeof GRADE_THRESHOLDS;