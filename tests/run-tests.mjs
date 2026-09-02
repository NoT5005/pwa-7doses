import assert from 'node:assert';
import test from 'node:test';

// Import services logic directly (compiled or pure ES)
import {
  getCurrentPracticeSummary,
  getActivePracticeSummaries,
  getAllPracticeSummaries,
  getPracticeSummaryDisplayName,
  suggestNextRoundNumber,
  formatMinutesToThaiDuration,
} from '../src/lib/services/practice.js';

import {
  calculatePracticeStats,
  calculateEffortEvaluation,
  getPeriodRange,
  formatThaiDate,
  formatThaiFullDate,
} from '../src/lib/services/stats.js';

import {
  checkCountUpChime,
  finalizePracticeSession,
} from '../src/lib/services/timer.js';

import { MASTER_PRACTICE_STEPS } from '../src/types/index.js';

test('Revision V2 - Current Practice Resolution Logic', () => {
  const steps = MASTER_PRACTICE_STEPS.map((s) => ({
    ...s,
    created_at: new Date().toISOString(),
  }));

  const sampleSummaries = [
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

  const current = getCurrentPracticeSummary(sampleSummaries);
  assert.notStrictEqual(current, null);
  assert.strictEqual(current.id, 103);
  assert.strictEqual(current.practice_step_id, 1);
  assert.strictEqual(current.round_number, 2);

  // When all are completed
  const allCompleted = sampleSummaries.map((s) => ({ ...s, status: 'completed' }));
  assert.strictEqual(getCurrentPracticeSummary(allCompleted), null);

  // Active summaries
  const active = getActivePracticeSummaries(sampleSummaries);
  assert.strictEqual(active.length, 2);
  assert.deepStrictEqual(active.map((s) => s.id), [103, 102]);

  // Display name
  const name = getPracticeSummaryDisplayName(sampleSummaries[2]);
  assert.strictEqual(name, 'ขั้นที่ 1 ระลึกถึงพระรัตนตรัย — รอบที่ 2');

  // Next round suggestion
  assert.strictEqual(suggestNextRoundNumber(sampleSummaries, 1), 3);
  assert.strictEqual(suggestNextRoundNumber(sampleSummaries, 3), 1);
});

test('Practice Statistics & Same-Day Multi-Session Verification', () => {
  const sampleSummaries = [
    {
      id: 101,
      user_id: 'user-1',
      practice_step_id: 1,
      round_number: 1,
      carried_duration_minutes: 120, // 2 hours
      status: 'completed',
    },
    {
      id: 102,
      user_id: 'user-1',
      practice_step_id: 2,
      round_number: 1,
      carried_duration_minutes: 0,
      status: 'active',
    },
    {
      id: 103,
      user_id: 'user-1',
      practice_step_id: 1,
      round_number: 2,
      carried_duration_minutes: 0,
      status: 'active',
    },
  ];

  const sampleSessions = [
    // Same day: 2026-08-15 Morning session for Summary 103 (30 mins = 1800s)
    {
      id: 1,
      user_id: 'user-1',
      practice_summary_id: 103,
      practice_date: '2026-08-15',
      duration_seconds: 1800,
      source: 'timer',
      session_status: 'completed',
    },
    // Same day: 2026-08-15 Evening session for Summary 102 (45 mins = 2700s)
    {
      id: 2,
      user_id: 'user-1',
      practice_summary_id: 102,
      practice_date: '2026-08-15',
      duration_seconds: 2700,
      source: 'manual',
      session_status: 'completed',
    },
    // Different day: 2026-08-16 session for Summary 103 (60 mins = 3600s)
    {
      id: 3,
      user_id: 'user-1',
      practice_summary_id: 103,
      practice_date: '2026-08-16',
      duration_seconds: 3600,
      source: 'timer',
      session_status: 'completed',
    },
  ];

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
  assert.strictEqual(stats.totalAllTimeMinutes, 255); // 135 + 120 carried

  // Summary 103 only
  const stats103 = calculatePracticeStats(
    sampleSessions,
    sampleSummaries,
    103,
    'month',
    new Date('2026-08-15')
  );
  assert.strictEqual(stats103.distinctDays, 2);
  assert.strictEqual(stats103.totalPeriodMinutes, 90);
  assert.strictEqual(stats103.totalAllTimeMinutes, 90);
  assert.strictEqual(stats103.averageMinutesPerDay, 45);
});

test('Effort Evaluation Logic', () => {
  const stats = {
    distinctDays: 22,
    daysInPeriod: 31,
    totalPeriodMinutes: 1320,
    averageMinutesPerDay: 60,
  };

  const evalResult = calculateEffortEvaluation(stats);
  assert.strictEqual(evalResult.hasData, true);
  assert.strictEqual(evalResult.dayScore, 3);
  assert.strictEqual(evalResult.dayLabel, 'ดี');
  assert.strictEqual(evalResult.durationScore, 3);
  assert.strictEqual(evalResult.durationLabel, 'ดี');
  assert.strictEqual(evalResult.overallScore, 3);
  assert.strictEqual(evalResult.overallLabel, 'ความเพียรดี');

  // Empty stats
  const emptyResult = calculateEffortEvaluation({
    distinctDays: 0,
    daysInPeriod: 31,
    totalPeriodMinutes: 0,
    averageMinutesPerDay: 0,
  });
  assert.strictEqual(emptyResult.hasData, false);
  assert.strictEqual(emptyResult.overallLabel, 'ยังไม่มีข้อมูลสำหรับประเมิน');
});

test('Timer and Chime Interval Detection', () => {
  assert.deepStrictEqual(checkCountUpChime(599, 0), { shouldPlay: false, newChimeIndex: 0 });
  assert.deepStrictEqual(checkCountUpChime(600, 0), { shouldPlay: true, newChimeIndex: 1 });
  assert.deepStrictEqual(checkCountUpChime(605, 1), { shouldPlay: false, newChimeIndex: 1 });
  assert.deepStrictEqual(checkCountUpChime(1200, 1), { shouldPlay: true, newChimeIndex: 2 });

  const targetEnd = new Date(Date.now() - 300000).toISOString();
  const session = {
    id: 1,
    user_id: 'user-1',
    practice_summary_id: 101,
    started_at: new Date(Date.now() - 2100000).toISOString(),
    target_end_at: targetEnd,
    planned_duration_seconds: 1800,
    timer_mode: 'count_down',
    session_status: 'running',
  };

  const finalized = finalizePracticeSession(session, 'จิตสงบ');
  assert.strictEqual(finalized.duration_seconds, 1800);
  assert.strictEqual(finalized.session_status, 'completed');
  assert.strictEqual(finalized.result_note, 'จิตสงบ');
});

console.log('🎉 ALL V2 BUSINESS LOGIC TESTS PASSED SUCCESSFULLY!');
