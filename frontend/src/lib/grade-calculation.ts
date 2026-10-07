export const gradeScale = [
  { grade: "A", minimum: 80 }, { grade: "B+", minimum: 75 },
  { grade: "B", minimum: 70 }, { grade: "C+", minimum: 65 },
  { grade: "C", minimum: 60 }, { grade: "D+", minimum: 55 },
  { grade: "D", minimum: 50 }, { grade: "F", minimum: 0 },
];

export interface ScoreItem { score: number | null; maxScore: number; weight: number }

export function calculateGrade(items: ScoreItem[], targetGrade: string) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  const invalid = !gradeScale.some((row) => row.grade === targetGrade) || totalWeight > 100.000001 || items.some((item) =>
    !Number.isFinite(item.maxScore) || item.maxScore <= 0 || !Number.isFinite(item.weight) || item.weight < 0 || item.weight > 100 ||
    (item.score !== null && (!Number.isFinite(item.score) || item.score < 0 || item.score > item.maxScore)),
  );
  if (invalid) return null;
  const known = items.filter((item) => item.score !== null);
  const currentWeightedScore = known.reduce((sum, item) => sum + ((item.score ?? 0) / item.maxScore) * item.weight, 0);
  const completedWeight = known.reduce((sum, item) => sum + item.weight, 0);
  const remainingWeight = Math.max(0, 100 - completedWeight);
  const targetScore = gradeScale.find((row) => row.grade === targetGrade)!.minimum;
  const reached = currentWeightedScore >= targetScore;
  const requiredAverage = remainingWeight > 0 ? Math.max(0, (targetScore - currentWeightedScore) / remainingWeight * 100) : null;
  return {
    totalWeight, currentWeightedScore, completedWeight, remainingWeight, targetScore, reached, requiredAverage,
    currentGrade: gradeScale.find((row) => currentWeightedScore >= row.minimum)?.grade ?? "F",
    possible: reached || (remainingWeight > 0 && requiredAverage !== null && requiredAverage <= 100),
  };
}
