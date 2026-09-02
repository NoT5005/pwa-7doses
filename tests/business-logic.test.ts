import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
  getCurrentPracticeSummary,
  getActivePracticeSummaries,
  getAllPracticeSummaries,
  getPracticeSummaryDisplayName,
  suggestNextRoundNumber,
  formatMinutesToThaiDuration,
  formatSecondsToDigital,
} from '../src/lib/services/practice';

import {
  calculatePracticeStats,
  calculateEffortEvaluation,
  getPeriodRange,
  formatThaiDate,
  formatThaiFullDate,
} from '../src/lib/services/stats';

import {
  checkCountUpChime,
  calculateRemainingSeconds,
  finalizePracticeSession,
} from '../src/lib/services/timer';

import { PracticeSummary, PracticeSession, PracticeStep, MASTER_PRACTICE_STEPS } from '../src/types/index';

describe('Revision V2 - Current Practice Resolution Logic', () => {
  const steps: PracticeStep[] = MASTER_PRACTICE_STEPS.map((s) => ({
    ...s,
    created_at: new Date().toISOString(),
  }));

  const sampleSummaries: PracticeSummary[] = [
    {
      id: 101,
      user_id: 'user-1',
      practice_step_id: 1,
      round_number: 1,
      carried_duration_minutes: 120,
      status: 'completed',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-15T00:00:00Z',
      step: steps[0],
    },
    {
      id: 102,
      user_id: 'user-1',
      practice_step_id: 2,
      round_number: 1,
      carried_duration_minutes: 60,
      status: 'active',
      created_at: '2026-01-16T00:00:00Z',
      updated_at: '2026-01-16T00:00:00Z',
      step: steps[1],
    },
    {
      id: 103,
      user_id: 'user-1',
      practice_step_id: 1,
      round_number: 2,
      carried_duration_minutes: 0,
      status: 'active',
      created_at: '2026-01-20T00:00:00Z',
      updated_at: '2026-01-20T00:00:00Z',
      step: steps[0],
    },
  ];

  it('correctly resolves Current Practice as ID 103 (Step 1 Round 2) because it is active and has highest ID', () => {
    const current = getCurrentPracticeSummary(sampleSummaries);
    assert.notStrictEqual(current, null);
    assert.strictEqual(current?.id, 103);
    assert.strictEqual(current?.practice_step_id, 1);
    assert.strictEqual(current?.round_number, 2);
  });

  it('returns null when no summaries are active', () => {
    const allCompleted = sampleSummaries.map((s) => ({ ...s, status: 'completed' as const }));
    const current = getCurrentPracticeSummary(allCompleted);
    assert.strictEqual(current, null);
  });

  it('returns only active summaries in getActivePracticeSummaries', () => {
    const active = getActivePracticeSummaries(sampleSummaries);
    assert.strictEqual(active.length, 2);
    assert.deepStrictEqual(active.map((s) => s.id), [103, 102]);
  });

  it('returns formatted display name correctly', () => {
    const name = getPracticeSummaryDisplayName(sampleSummaries[2]);
    assert.strictEqual(name, 'ขั้นที่ 1 ระลึกถึงพระรัตนตรัย — รอบที่ 2');
  });

  it('suggests next round number correctly', () => {
    const nextRoundForStep1 = suggestNextRoundNumber(sampleSummaries, 1);
    assert.strictEqual(nextRoundForStep1, 3);

    const nextRoundForStep3 = suggestNextRoundNumber(sampleSummaries, 3);
    assert.strictEqual(nextRoundForStep3, 1);
  });
});

describe('Practice Statistics & Same-Day Multi-Session Verification', () => {
  const sampleSummaries: PracticeSummary[] = [
    {
      id: 101,
      user_id: 'user-1',
      practice_step_id: 1,
      round_number: 1,
      carried_duration_minutes: 120,
      status: 'completed',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
    {
      id: 102,
      user_id: 'user-1',
      practice_step_id: 2,
      round_number: 1,
      carried_duration_minutes: 0,
      status: 'active',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
    {
      id: 103,
      user_id: 'user-1',
      practice_step_id: 1,
      round_number: 2,
      carried_duration_minutes: 0,
      status: 'active',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
  ];

  const sampleSessions: PracticeSession[] = [
    {
      id: 1,
      user_id: 'user-1',
      practice_summary_id: 103,
      practice_date: '2026-08-15',
      duration_seconds: 1800,
      source: 'timer',
      session_status: 'completed',
      created_at: '2026-08-15T08:00:00Z',
      updated_at: '2026-08-15T08:30:00Z',
    },
    {
      id: 2,
      user_id: 'user-1',
      practice_summary_id: 102,
      practice_date: '2026-08-15',
      duration_seconds: 2700,
      source: 'manual',
      session_status: 'completed',
      created_at: '2026-08-15T20:00:00Z',
      updated_at: '2026-08-15T20:45:00Z',
    },
    {
      id: 3,
      user_id: 'user-1',
      practice_summary_id: 103,
      practice_date: '2026-08-16',
      duration_seconds: 3600,
      source: 'timer',
      session_status: 'completed',
      created_at: '2026-08-16T09:00:00Z',
      updated_at: '2026-08-16T10:00:00Z',
    },
  ];

  it('counts distinct days as 2 days despite 3 sessions (2 sessions on 2026-08-15)', () => {
    const stats = calculatePracticeStats(
      sampleSessions,
      sampleSummaries,
      'all',
      'month',
      new Date('2026-08-15')
    );

    assert.strictEqual(stats.distinctDays, 2);
    assert.strictEqual(stats.totalPeriodMinutes, 135);
    assert.strictEqual(stats.averageMinutesPerDay, 68);
    assert.strictEqual(stats.totalAllTimeMinutes, 255);
  });

  it('filters by selected summary 103 accurately', () => {
    const stats = calculatePracticeStats(
      sampleSessions,
      sampleSummaries,
      103,
      'month',
      new Date('2026-08-15')
    );

    assert.strictEqual(stats.distinctDays, 2);
    assert.strictEqual(stats.totalPeriodMinutes, 90);
    assert.strictEqual(stats.carriedMinutes, 0);
    assert.strictEqual(stats.totalAllTimeMinutes, 90);
    assert.strictEqual(stats.averageMinutesPerDay, 45);
  });
});

describe('Effort Evaluation Logic', () => {
  it('evaluates effort accurately based on days and average duration', () => {
    const stats: any = {
      distinctDays: 22,
      daysInPeriod: 31,
      totalPeriodMinutes: 1320,
      averageMinutesPerDay: 60,
    };

    const evaluation = calculateEffortEvaluation(stats);
    assert.strictEqual(evaluation.hasData, true);
    assert.strictEqual(evaluation.dayScore, 3);
    assert.strictEqual(evaluation.dayLabel, 'ดี');
    assert.strictEqual(evaluation.durationScore, 3);
    assert.strictEqual(evaluation.durationLabel, 'ดี');
    assert.strictEqual(evaluation.overallScore, 3);
    assert.strictEqual(evaluation.overallLabel, 'ความเพียรดี');
  });

  it('handles empty state without giving 0 score warning', () => {
    const emptyStats: any = {
      distinctDays: 0,
      daysInPeriod: 31,
      totalPeriodMinutes: 0,
      averageMinutesPerDay: 0,
    };

    const evaluation = calculateEffortEvaluation(emptyStats);
    assert.strictEqual(evaluation.hasData, false);
    assert.strictEqual(evaluation.overallLabel, 'ยังไม่มีข้อมูลสำหรับประเมิน');
  });
});

describe('Timer and Chime Interval Detection', () => {
  it('triggers chime at 10-minute boundary and avoids duplicate triggers', () => {
    assert.deepStrictEqual(checkCountUpChime(599, 0), { shouldPlay: false, newChimeIndex: 0 });
    assert.deepStrictEqual(checkCountUpChime(600, 0), { shouldPlay: true, newChimeIndex: 1 });
    assert.deepStrictEqual(checkCountUpChime(605, 1), { shouldPlay: false, newChimeIndex: 1 });
    assert.deepStrictEqual(checkCountUpChime(1200, 1), { shouldPlay: true, newChimeIndex: 2 });
  });

  it('preserves preset duration in countdown even when stopping past target_end_at', () => {
    const targetEnd = new Date(Date.now() - 300000).toISOString();
    const session: any = {
      id: 1,
      user_id: 'user-1',
      practice_summary_id: 101,
      started_at: new Date(Date.now() - 2100000).toISOString(),
      target_end_at: targetEnd,
      planned_duration_seconds: 1800,
      timer_mode: 'count_down',
      session_status: 'running',
    };

    const finalized = finalizePracticeSession(session, 'รู้สึกสงบ');
    assert.strictEqual(finalized.duration_seconds, 1800);
    assert.strictEqual(finalized.session_status, 'completed');
    assert.strictEqual(finalized.result_note, 'รู้สึกสงบ');
  });
});
