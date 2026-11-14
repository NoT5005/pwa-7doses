import { PracticeSession } from '../../types';

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
 * Check whether an active session is currently paused.
 * A session with session_status === 'running' and started_at === null is paused,
 * holding its accumulated time in duration_seconds.
 */
export function isSessionPaused(session?: PracticeSession | null): boolean {
  if (!session) return false;
  return session.session_status === 'running' && !session.started_at;
}

/**
 * Calculate elapsed seconds for a running segment + optional prior accumulated seconds
 */
export function calculateElapsedSeconds(
  startedAtStr?: string | null,
  accumulatedSeconds: number = 0
): number {
  const base = Math.max(0, accumulatedSeconds || 0);
  if (!startedAtStr) return base;
  const startedAt = new Date(startedAtStr).getTime();
  const now = Date.now();
  return base + Math.max(0, Math.floor((now - startedAt) / 1000));
}

/**
 * Calculate total active practice seconds for a session (accounting for pauses)
 */
export function calculateActiveElapsedSeconds(session?: PracticeSession | null): number {
  if (!session) return 0;
  return calculateElapsedSeconds(session.started_at, session.duration_seconds || 0);
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
 * Unified helper for computing current display seconds, active elapsed seconds, and status
 */
export function calculateSessionDisplayState(session: PracticeSession): {
  displaySeconds: number;
  activeElapsedSeconds: number;
  isCompleted: boolean;
  isPaused: boolean;
} {
  const paused = isSessionPaused(session);
  const activeElapsedSeconds = calculateActiveElapsedSeconds(session);

  if (session.timer_mode === 'count_down') {
    const planned = session.planned_duration_seconds || 0;
    if (paused) {
      const remaining = Math.max(0, planned - activeElapsedSeconds);
      return {
        displaySeconds: remaining,
        activeElapsedSeconds,
        isCompleted: remaining <= 0,
        isPaused: true,
      };
    }

    if (session.target_end_at) {
      const { remainingSeconds, isCompleted } = calculateRemainingSeconds(session.target_end_at);
      const effectiveElapsed = isCompleted ? planned : Math.min(planned, activeElapsedSeconds);
      return {
        displaySeconds: remainingSeconds,
        activeElapsedSeconds: effectiveElapsed,
        isCompleted,
        isPaused: false,
      };
    }

    const remaining = Math.max(0, planned - activeElapsedSeconds);
    return {
      displaySeconds: remaining,
      activeElapsedSeconds,
      isCompleted: remaining <= 0,
      isPaused: false,
    };
  }

  return {
    displaySeconds: activeElapsedSeconds,
    activeElapsedSeconds,
    isCompleted: false,
    isPaused: paused,
  };
}

/**
 * Pause a running session, banking elapsed time into duration_seconds and clearing started_at
 */
export function pausePracticeSession(session: PracticeSession): PracticeSession {
  if (isSessionPaused(session)) return session;
  const activeElapsed = calculateActiveElapsedSeconds(session);
  const nowIso = new Date().toISOString();

  return {
    ...session,
    duration_seconds: activeElapsed,
    started_at: null,
    target_end_at: null,
    updated_at: nowIso,
  };
}

/**
 * Resume a paused session from banked duration_seconds
 */
export function resumePracticeSession(session: PracticeSession): PracticeSession {
  if (!isSessionPaused(session)) return session;
  const now = new Date();
  const accumulated = session.duration_seconds || 0;

  let targetEndAt: string | null = null;
  if (session.timer_mode === 'count_down' && session.planned_duration_seconds) {
    const remainingSeconds = Math.max(1, session.planned_duration_seconds - accumulated);
    targetEndAt = new Date(now.getTime() + remainingSeconds * 1000).toISOString();
  }

  return {
    ...session,
    started_at: now.toISOString(),
    target_end_at: targetEndAt,
    updated_at: now.toISOString(),
  };
}

/**
 * Check if a chime should play every 10 minutes of active practice (600s).
 * Returns shouldPlay = true and newChimeIndex when crossing each 600s boundary.
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
  const totalActiveElapsed = calculateActiveElapsedSeconds(session);
  let durationSeconds = 0;

  if (session.timer_mode === 'count_down' && session.planned_duration_seconds) {
    const targetReached =
      Boolean(session.target_end_at) &&
      new Date(session.target_end_at!).getTime() <= now.getTime();

    if (targetReached || totalActiveElapsed >= session.planned_duration_seconds) {
      durationSeconds = session.planned_duration_seconds;
    } else {
      durationSeconds = Math.min(session.planned_duration_seconds, totalActiveElapsed);
    }
  } else {
    durationSeconds = totalActiveElapsed;
  }

  // Ensure started_at <= ended_at for DB constraint chk_session_times
  const candidateStart = session.created_at || session.started_at || now.toISOString();
  const startMs = Math.min(new Date(candidateStart).getTime(), now.getTime());

  return {
    ...session,
    started_at: new Date(startMs).toISOString(),
    ended_at: now.toISOString(),
    duration_seconds: durationSeconds,
    result_note: resultNote ?? session.result_note,
    session_status: 'completed',
    updated_at: now.toISOString(),
  };
}
