// ==============================================================================
// 7Doses (ยาเจ็ดเม็ด) TypeScript Type Definitions
// ==============================================================================

export type PracticeStatus = 'active' | 'paused' | 'completed';
export type SessionSource = 'timer' | 'manual';
export type TimerMode = 'count_up' | 'count_down';
export type SessionStatus = 'running' | 'completed';
export type PeriodType = 'month' | 'year' | 'all';

export interface Profile {
  id: string;
  user_id: string;
  practitioner_name: string;
  email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PracticeStep {
  id: number;
  step_order: number;
  step_name: string;
  active: boolean;
  created_at: string;
}

export interface PracticeSummary {
  id: number;
  user_id: string;
  practice_step_id: number;
  round_number: number;
  carried_duration_minutes: number;
  start_date?: string | null;
  end_date?: string | null;
  status: PracticeStatus;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  step?: PracticeStep;
}

export interface PracticeSession {
  id: number;
  user_id: string;
  practice_summary_id: number;
  practice_date: string; // YYYY-MM-DD
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds: number;
  result_note?: string | null;
  source: SessionSource;
  timer_mode?: TimerMode | null;
  planned_duration_seconds?: number | null;
  target_end_at?: string | null;
  session_status: SessionStatus;
  last_chime_index?: number;
  created_at: string;
  updated_at: string;
  // Joined relation fields
  summary?: PracticeSummary & { step?: PracticeStep };
}

export interface EffortSettings {
  id: number;
  user_id: string;
  good_days_min: number;
  moderate_days_min: number;
  excellent_minutes_min: number;
  good_minutes_min: number;
  moderate_minutes_min: number;
  day_weight: number;
  duration_weight: number;
  created_at: string;
  updated_at: string;
}

export interface PracticeStats {
  distinctDays: number;
  totalPeriodMinutes: number;
  totalAllTimeMinutes: number;
  averageMinutesPerDay: number;
  carriedMinutes: number;
  daysInPeriod: number;
  practiceDaysList: string[]; // List of YYYY-MM-DD
}

export interface EffortEvaluation {
  dayScore: number; // 1 to 4
  dayLabel: 'ดีมาก' | 'ดี' | 'ค่อนข้างน้อย' | 'น้อย' | 'ยังไม่มีข้อมูล';
  dayStars: number;
  
  durationScore: number; // 1 to 4
  durationLabel: 'ดีมาก' | 'ดี' | 'ค่อนข้างดี' | 'ค่อนข้างน้อย' | 'ยังไม่มีข้อมูล';
  durationStars: number;
  
  overallScore: number; // 1.00 to 4.00
  overallLabel: 'ความเพียรดีมาก' | 'ความเพียรดี' | 'ความเพียรปานกลาง' | 'ความเพียรค่อนข้างน้อย' | 'ยังไม่มีข้อมูลสำหรับประเมิน';
  overallStars: number;
  hasData: boolean;
}

export const MASTER_PRACTICE_STEPS: Omit<PracticeStep, 'created_at'>[] = [
  { id: 1, step_order: 1, step_name: 'ระลึกถึงพระรัตนตรัย', active: true },
  { id: 2, step_order: 2, step_name: 'ทักอารมณ์', active: true },
  { id: 3, step_order: 3, step_name: 'ท่องธาตุกัมมัฏฐาน 4', active: true },
  { id: 4, step_order: 4, step_name: 'พิจารณากาย 6 ขั้นตอน', active: true },
  { id: 5, step_order: 5, step_name: 'ท่องขันธ์ 5', active: true },
  { id: 6, step_order: 6, step_name: 'ดูขันธ์ 5 เกิด ดับ', active: true },
  { id: 7, step_order: 7, step_name: 'พิจารณาขันธ์ 5 ลงสู่อริยสัจ 4', active: true },
];

export const DEFAULT_EFFORT_SETTINGS: Omit<EffortSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  good_days_min: 20,
  moderate_days_min: 10,
  excellent_minutes_min: 61,
  good_minutes_min: 30,
  moderate_minutes_min: 20,
  day_weight: 0.50,
  duration_weight: 0.50,
};
