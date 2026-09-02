import { PracticeSummary, PracticeStep, MASTER_PRACTICE_STEPS } from '../../types';

/**
 * Find the Current Practice Summary according to Revision V2:
 * "Current Practice ให้หาเฉพาะ Practice Summary ที่:
 * - เป็นของ User ปัจจุบัน
 * - status = 'active'
 * - มี id มากที่สุด"
 */
export function getCurrentPracticeSummary(
  summaries: PracticeSummary[]
): PracticeSummary | null {
  const activeSummaries = summaries.filter((s) => s.status === 'active');
  if (activeSummaries.length === 0) {
    return null;
  }
  // Sort descending by id (BIGINT / integer id)
  return [...activeSummaries].sort((a, b) => b.id - a.id)[0];
}

/**
 * Filter summaries that are currently active (for Timer and Manual add dropdowns)
 */
export function getActivePracticeSummaries(
  summaries: PracticeSummary[]
): PracticeSummary[] {
  return summaries
    .filter((s) => s.status === 'active')
    .sort((a, b) => {
      const orderA = a.step?.step_order ?? a.practice_step_id;
      const orderB = b.step?.step_order ?? b.practice_step_id;
      if (orderA !== orderB) return orderA - orderB;
      return a.round_number - b.round_number;
    });
}

/**
 * Return all summaries sorted nicely for Dashboard & History filters
 */
export function getAllPracticeSummaries(
  summaries: PracticeSummary[]
): PracticeSummary[] {
  return [...summaries].sort((a, b) => {
    const orderA = a.step?.step_order ?? a.practice_step_id;
    const orderB = b.step?.step_order ?? b.practice_step_id;
    if (orderA !== orderB) return orderA - orderB;
    return a.round_number - b.round_number;
  });
}

/**
 * Format practice summary name for UI:
 * "ขั้นที่ {step_order} {step_name} — รอบที่ {round_number}"
 */
export function getPracticeSummaryDisplayName(
  summary: PracticeSummary,
  masterSteps: PracticeStep[] = MASTER_PRACTICE_STEPS as PracticeStep[]
): string {
  const step =
    summary.step ||
    masterSteps.find((s) => s.id === summary.practice_step_id);

  const stepOrder = step?.step_order ?? summary.practice_step_id;
  const stepName = step?.step_name ?? `ขั้นตอนที่ ${stepOrder}`;

  return `ขั้นที่ ${stepOrder} ${stepName} — รอบที่ ${summary.round_number}`;
}

/**
 * Calculate the next round number when user adds a new summary for a step
 */
export function suggestNextRoundNumber(
  summaries: PracticeSummary[],
  stepId: number
): number {
  const matchingRounds = summaries
    .filter((s) => s.practice_step_id === stepId)
    .map((s) => s.round_number);

  if (matchingRounds.length === 0) {
    return 1;
  }

  return Math.max(...matchingRounds) + 1;
}

/**
 * Format duration minutes into Thai display text: "X ชั่วโมง Y นาที" or "Y นาที"
 */
export function formatMinutesToThaiDuration(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0 นาที';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);

  if (hours > 0 && minutes > 0) {
    return `${hours} ชั่วโมง ${minutes} นาที`;
  }
  if (hours > 0) {
    return `${hours} ชั่วโมง`;
  }
  return `${minutes} นาที`;
}

/**
 * Format seconds into HH:MM:SS format
 */
export function formatSecondsToDigital(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}
