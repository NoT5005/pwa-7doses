import {
  PracticeSession,
  PracticeSummary,
  EffortSettings,
  PracticeStats,
  EffortEvaluation,
  PeriodType,
  DEFAULT_EFFORT_SETTINGS,
} from '../../types';

/**
 * Get the date boundaries (YYYY-MM-DD) for a given period and anchor date
 */
export function getPeriodRange(
  periodType: PeriodType,
  anchorDate: Date = new Date()
): { startDate: string | null; endDate: string | null; daysInPeriod: number } {
  if (periodType === 'all') {
    return { startDate: null, endDate: null, daysInPeriod: 30 };
  }

  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth(); // 0-indexed

  if (periodType === 'month') {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0); // last day of month
    const daysInPeriod = end.getDate();

    const format = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    return {
      startDate: format(start),
      endDate: format(end),
      daysInPeriod,
    };
  }

  // periodType === 'year'
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    daysInPeriod: isLeapYear ? 366 : 365,
  };
}

/**
 * Filter sessions by selected practice summary (or all) and date range
 */
export function filterSessions(
  sessions: PracticeSession[],
  selectedSummaryId: number | 'all',
  startDate: string | null,
  endDate: string | null
): PracticeSession[] {
  return sessions.filter((s) => {
    // Only completed sessions count towards metrics
    if (s.session_status !== 'completed') return false;

    // Filter by summary if not 'all'
    if (selectedSummaryId !== 'all' && s.practice_summary_id !== selectedSummaryId) {
      return false;
    }

    // Filter by date
    if (startDate && s.practice_date < startDate) return false;
    if (endDate && s.practice_date > endDate) return false;

    return true;
  });
}

/**
 * Calculate full Practice Statistics
 */
export function calculatePracticeStats(
  allSessions: PracticeSession[],
  allSummaries: PracticeSummary[],
  selectedSummaryId: number | 'all',
  periodType: PeriodType,
  anchorDate: Date = new Date()
): PracticeStats {
  const { startDate, endDate, daysInPeriod } = getPeriodRange(periodType, anchorDate);

  const filtered = filterSessions(allSessions, selectedSummaryId, startDate, endDate);

  // 1. DISTINCT practice_date
  const uniqueDates = Array.from(new Set(filtered.map((s) => s.practice_date)));
  const distinctDays = uniqueDates.length;

  // 2. Total Period Duration (minutes from sessions)
  const totalPeriodSeconds = filtered.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0
  );
  const totalPeriodMinutes = Math.round(totalPeriodSeconds / 60);

  // 3. Average Duration per practice day
  const averageMinutesPerDay =
    distinctDays > 0 ? Math.round(totalPeriodMinutes / distinctDays) : 0;

  // 4. Carried Duration
  let carriedMinutes = 0;
  if (selectedSummaryId === 'all') {
    carriedMinutes = allSummaries.reduce(
      (sum, s) => sum + (s.carried_duration_minutes || 0),
      0
    );
  } else {
    const summary = allSummaries.find((s) => s.id === selectedSummaryId);
    carriedMinutes = summary?.carried_duration_minutes || 0;
  }

  // 5. Total All-Time Duration (All sessions for this scope + Carried duration)
  const allTimeSessionsForScope = allSessions.filter((s) => {
    if (s.session_status !== 'completed') return false;
    if (selectedSummaryId !== 'all' && s.practice_summary_id !== selectedSummaryId) {
      return false;
    }
    return true;
  });
  const allTimeSeconds = allTimeSessionsForScope.reduce(
    (sum, s) => sum + (s.duration_seconds || 0),
    0
  );
  const totalAllTimeMinutes = Math.round(allTimeSeconds / 60) + carriedMinutes;

  return {
    distinctDays,
    totalPeriodMinutes,
    totalAllTimeMinutes,
    averageMinutesPerDay,
    carriedMinutes,
    daysInPeriod,
    practiceDaysList: uniqueDates,
  };
}

/**
 * Calculate Effort Evaluation Score based on Days, Duration, and configurable settings
 */
export function calculateEffortEvaluation(
  stats: PracticeStats,
  settings: Partial<EffortSettings> = DEFAULT_EFFORT_SETTINGS
): EffortEvaluation {
  const mergedSettings = { ...DEFAULT_EFFORT_SETTINGS, ...settings };

  if (stats.distinctDays === 0) {
    return {
      dayScore: 0,
      dayLabel: 'ยังไม่มีข้อมูล',
      dayStars: 0,
      durationScore: 0,
      durationLabel: 'ยังไม่มีข้อมูล',
      durationStars: 0,
      overallScore: 0,
      overallLabel: 'ยังไม่มีข้อมูลสำหรับประเมิน',
      overallStars: 0,
      hasData: false,
    };
  }

  // 1. Day Score Evaluation
  let dayScore = 1;
  let dayLabel: EffortEvaluation['dayLabel'] = 'น้อย';
  let dayStars = 1;

  if (stats.distinctDays >= stats.daysInPeriod) {
    // Completed every single day of the period
    dayScore = 4;
    dayLabel = 'ดีมาก';
    dayStars = 4;
  } else if (stats.distinctDays >= mergedSettings.good_days_min) {
    dayScore = 3;
    dayLabel = 'ดี';
    dayStars = 3;
  } else if (stats.distinctDays >= mergedSettings.moderate_days_min) {
    dayScore = 2;
    dayLabel = 'ค่อนข้างน้อย';
    dayStars = 2;
  } else {
    dayScore = 1;
    dayLabel = 'น้อย';
    dayStars = 1;
  }

  // 2. Duration Score Evaluation (Average minutes per practice day)
  let durationScore = 1;
  let durationLabel: EffortEvaluation['durationLabel'] = 'ค่อนข้างน้อย';
  let durationStars = 1;

  if (stats.averageMinutesPerDay >= mergedSettings.excellent_minutes_min) {
    durationScore = 4;
    durationLabel = 'ดีมาก';
    durationStars = 4;
  } else if (stats.averageMinutesPerDay >= mergedSettings.good_minutes_min) {
    durationScore = 3;
    durationLabel = 'ดี';
    durationStars = 3;
  } else if (stats.averageMinutesPerDay >= mergedSettings.moderate_minutes_min) {
    durationScore = 2;
    durationLabel = 'ค่อนข้างดี';
    durationStars = 2;
  } else {
    durationScore = 1;
    durationLabel = 'ค่อนข้างน้อย';
    durationStars = 1;
  }

  // 3. Overall Weighted Score
  const dayWeight = Number(mergedSettings.day_weight) || 0.5;
  const durationWeight = Number(mergedSettings.duration_weight) || 0.5;

  const rawScore = dayScore * dayWeight + durationScore * durationWeight;
  const overallScore = Math.round(rawScore * 100) / 100;

  let overallLabel: EffortEvaluation['overallLabel'] = 'ความเพียรค่อนข้างน้อย';
  let overallStars = 1;

  if (overallScore >= 3.5) {
    overallLabel = 'ความเพียรดีมาก';
    overallStars = 4;
  } else if (overallScore >= 2.5) {
    overallLabel = 'ความเพียรดี';
    overallStars = 3;
  } else if (overallScore >= 1.5) {
    overallLabel = 'ความเพียรปานกลาง';
    overallStars = 2;
  } else {
    overallLabel = 'ความเพียรค่อนข้างน้อย';
    overallStars = 1;
  }

  return {
    dayScore,
    dayLabel,
    dayStars,
    durationScore,
    durationLabel,
    durationStars,
    overallScore,
    overallLabel,
    overallStars,
    hasData: true,
  };
}

/**
 * Format Thai Buddhist Era Date (พ.ศ.)
 * e.g. "28 สิงหาคม 2569" or "< สิงหาคม 2569 >"
 */
const THAI_MONTH_NAMES = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

const THAI_MONTH_ABBR = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

export function formatThaiDate(dateStringOrDate: string | Date): string {
  const d =
    typeof dateStringOrDate === 'string'
      ? new Date(dateStringOrDate.includes('T') ? dateStringOrDate : `${dateStringOrDate}T00:00:00`)
      : dateStringOrDate;

  if (isNaN(d.getTime())) return '';

  const day = d.getDate();
  const month = THAI_MONTH_ABBR[d.getMonth()];
  const yearBE = d.getFullYear() + 543;

  return `${day} ${month} ${yearBE}`;
}

export function formatThaiFullDate(dateStringOrDate: string | Date): string {
  const d =
    typeof dateStringOrDate === 'string'
      ? new Date(dateStringOrDate.includes('T') ? dateStringOrDate : `${dateStringOrDate}T00:00:00`)
      : dateStringOrDate;

  if (isNaN(d.getTime())) return '';

  const day = d.getDate();
  const month = THAI_MONTH_NAMES[d.getMonth()];
  const yearBE = d.getFullYear() + 543;

  return `${day} ${month} ${yearBE}`;
}

export function formatThaiMonthYear(date: Date): string {
  const month = THAI_MONTH_NAMES[date.getMonth()];
  const yearBE = date.getFullYear() + 543;
  return `${month} ${yearBE}`;
}

export function formatThaiYear(date: Date): string {
  const yearBE = date.getFullYear() + 543;
  return `ปี พ.ศ. ${yearBE}`;
}
