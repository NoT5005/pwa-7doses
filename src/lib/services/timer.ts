import { PracticeSession, TimerMode } from '../../types';

/**
 * Start a Count-Up Practice Session
 */
export function startCountUpSession(
  userId: string,
  practiceSummaryId: number
): Omit<PracticeSession, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return {
    user_id: userId,
    practice_summary_id: practiceSummaryId,
    practice_date: todayStr,
    started_at: now.toISOString(),
    ended_at: null,
    duration_seconds: 0,
    result_note: null,
    source: 'timer',
    timer_mode: 'count_up',
    planned_duration_seconds: null,
    target_end_at: null,
    session_status: 'running',
    last_chime_index: 0,
  };
}

/**
 * Start a Count-Down Practice Session
 */
export function startCountDownSession(
  userId: string,
  practiceSummaryId: number,
  plannedMinutes: number
): Omit<PracticeSession, 'id' | 'created_at' | 'updated_at'> {
  const now = new Date();
  const plannedSeconds = Math.max(60, plannedMinutes * 60);
  const targetEnd = new Date(now.getTime() + plannedSeconds * 1000);
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  return {
    user_id: userId,
    practice_summary_id: practiceSummaryId,
    practice_date: todayStr,
    started_at: now.toISOString(),
    ended_at: null,
    duration_seconds: 0,
    result_note: null,
    source: 'timer',
    timer_mode: 'count_down',
    planned_duration_seconds: plannedSeconds,
    target_end_at: targetEnd.toISOString(),
    session_status: 'running',
    last_chime_index: 0,
  };
}

/**
 * Calculate elapsed seconds for a running count-up session
 */
export function calculateElapsedSeconds(startedAtStr?: string | null): number {
  if (!startedAtStr) return 0;
  const startedAt = new Date(startedAtStr).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - startedAt) / 1000));
}

/**
 * Calculate remaining seconds for a running count-down session
 */
export function calculateRemainingSeconds(
  targetEndAtStr?: string | null
): { remainingSeconds: number; isCompleted: boolean } {
  if (!targetEndAtStr) return { remainingSeconds: 0, isCompleted: true };
  const targetEnd = new Date(targetEndAtStr).getTime();
  const now = Date.now();
  const diff = Math.floor((targetEnd - now) / 1000);

  if (diff <= 0) {
    return { remainingSeconds: 0, isCompleted: true };
  }
  return { remainingSeconds: diff, isCompleted: false };
}

/**
 * Check if a chime should play for count-up timer (every 10 minutes = 600s).
 * Returns the new chime index if a new interval boundary was crossed, or null.
 */
export function checkCountUpChime(
  elapsedSeconds: number,
  lastChimeIndex: number = 0
): { shouldPlay: boolean; newChimeIndex: number } {
  const currentChimeIndex = Math.floor(elapsedSeconds / 600); // 10 mins = 600s

  if (currentChimeIndex > 0 && currentChimeIndex > lastChimeIndex) {
    return {
      shouldPlay: true,
      newChimeIndex: currentChimeIndex,
    };
  }

  return {
    shouldPlay: false,
    newChimeIndex: lastChimeIndex,
  };
}

/**
 * Finalize/Stop a Practice Session
 */
export function finalizePracticeSession(
  session: PracticeSession,
  resultNote?: string | null
): PracticeSession {
  const now = new Date();
  let durationSeconds = 0;

  if (session.timer_mode === 'count_down' && session.planned_duration_seconds) {
    // If countdown, duration is fixed to planned_duration_seconds
    durationSeconds = session.planned_duration_seconds;
  } else if (session.started_at) {
    const start = new Date(session.started_at).getTime();
    durationSeconds = Math.max(0, Math.floor((now.getTime() - start) / 1000));
  } else {
    durationSeconds = session.duration_seconds || 0;
  }

  return {
    ...session,
    ended_at: now.toISOString(),
    duration_seconds: durationSeconds,
    result_note: resultNote ?? session.result_note,
    session_status: 'completed',
    updated_at: now.toISOString(),
  };
}
