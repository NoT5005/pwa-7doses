'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/supabase/store';
import {
  calculatePracticeStats,
  calculateEffortEvaluation,
  formatThaiMonthYear,
  formatThaiYear,
} from '@/lib/services/stats';
import {
  getPracticeSummaryDisplayName,
  formatMinutesToThaiDuration,
} from '@/lib/services/practice';
import { PeriodType } from '@/types';
import { DonutChart } from '@/components/dashboard/DonutChart';
import { EffortCard } from '@/components/dashboard/EffortCard';
import { PillBadge } from '@/components/ui/PillBadge';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  PlusCircle,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  BarChart3,
} from 'lucide-react';

export default function DashboardPage() {
  const {
    profile,
    currentSummary,
    allSummaries,
    practiceSessions,
    effortSettings,
    isLoading,
  } = useStore();

  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [anchorDate, setAnchorDate] = useState<Date>(new Date());
  const [selectedSummaryId, setSelectedSummaryId] = useState<number | 'all'>(() => {
    return currentSummary ? currentSummary.id : 'all';
  });

  // Keep selected summary synchronized with current summary if not manually altered
  const effectiveSummaryId = useMemo(() => {
    if (selectedSummaryId === 'all') return 'all';
    const exists = allSummaries.some((s) => s.id === selectedSummaryId);
    if (!exists) {
      return currentSummary ? currentSummary.id : 'all';
    }
    return selectedSummaryId;
  }, [selectedSummaryId, allSummaries, currentSummary]);

  // Navigate Period (Month / Year)
  const handlePrevPeriod = () => {
    const next = new Date(anchorDate);
    if (periodType === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (periodType === 'year') {
      next.setFullYear(next.getFullYear() - 1);
    }
    setAnchorDate(next);
  };

  const handleNextPeriod = () => {
    const next = new Date(anchorDate);
    if (periodType === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (periodType === 'year') {
      next.setFullYear(next.getFullYear() + 1);
    }
    setAnchorDate(next);
  };

  // Compute stats
  const stats = useMemo(() => {
    return calculatePracticeStats(
      practiceSessions,
      allSummaries,
      effectiveSummaryId,
      periodType,
      anchorDate
    );
  }, [practiceSessions, allSummaries, effectiveSummaryId, periodType, anchorDate]);

  const effortEvaluation = useMemo(() => {
    return calculateEffortEvaluation(stats, effortSettings);
  }, [stats, effortSettings]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  const hasSessions = practiceSessions.some((s) => s.session_status === 'completed');

  return (
    <div className="space-y-5 animate-fade-in pb-8">
      {/* 1. Header Greeting & Current Step Card */}
      <div className="bg-gradient-to-br from-primary-800 to-primary-900 text-white rounded-3xl p-5 sm:p-6 shadow-elevated relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider font-semibold text-primary-200">
              บันทึกการปฏิบัติธรรม
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-primary-700/80 text-primary-100 font-medium border border-primary-600/50">
              7Doses (ยา 7 เม็ด)
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-4">
            สวัสดี, {profile?.practitioner_name || 'ผู้ปฏิบัติธรรม'}
          </h1>

          {/* Current Step Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-primary-100 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                ขั้นตอนปัจจุบัน
              </span>
              {currentSummary && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-200 font-bold border border-amber-300/30">
                  รอบที่ {currentSummary.round_number}
                </span>
              )}
            </div>

            {currentSummary ? (
              <div className="flex items-center gap-3 mt-2">
                <PillBadge
                  stepOrder={currentSummary.step?.step_order || currentSummary.practice_step_id}
                  size="md"
                />
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                    {getPracticeSummaryDisplayName(currentSummary)}
                  </h2>
                  <p className="text-xs text-primary-200 mt-0.5">
                    {currentSummary.carried_duration_minutes > 0
                      ? `เวลายกมา ${formatMinutesToThaiDuration(currentSummary.carried_duration_minutes)}`
                      : 'กำลังปฏิบัติ'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-2 flex items-center justify-between">
                <span className="text-sm text-primary-100">ยังไม่มีขั้นตอนที่กำลังปฏิบัติ</span>
                <Link
                  href="/steps"
                  className="text-xs px-3 py-1.5 rounded-xl bg-white text-primary-900 font-bold hover:bg-primary-50 transition-colors"
                >
                  เพิ่มขั้นตอนการปฏิบัติ
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Period Selector & Mode Switcher */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-soft space-y-3">
        {/* Period Mode Switcher [ เดือน ] [ ปี ] [ ทั้งหมด ] */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100/80 rounded-2xl">
          {(['month', 'year', 'all'] as PeriodType[]).map((type) => {
            const labels: Record<PeriodType, string> = {
              month: 'เดือน',
              year: 'ปี',
              all: 'ทั้งหมด',
            };
            const isSelected = periodType === type;
            return (
              <button
                key={type}
                onClick={() => setPeriodType(type)}
                className={`py-2 text-sm font-bold rounded-xl transition-all ${
                  isSelected
                    ? 'bg-white text-primary-800 shadow-sm'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>

        {/* Date Navigator (< สิงหาคม 2569 >) */}
        {periodType !== 'all' && (
          <div className="flex items-center justify-between px-2 pt-1">
            <button
              onClick={handlePrevPeriod}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 active:scale-95 transition-all"
              aria-label="ช่วงก่อนหน้า"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="text-base font-extrabold text-stone-800">
              {periodType === 'month'
                ? formatThaiMonthYear(anchorDate)
                : formatThaiYear(anchorDate)}
            </span>
            <button
              onClick={handleNextPeriod}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-stone-600 hover:bg-stone-100 active:scale-95 transition-all"
              aria-label="ช่วงถัดไป"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Step / Summary Filter Dropdown */}
        <div className="pt-2 border-t border-stone-100">
          <label className="block text-xs font-bold text-stone-600 mb-1.5">
            กรองตามขั้นตอน / รอบ
          </label>
          <select
            value={effectiveSummaryId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSummaryId(val === 'all' ? 'all' : Number(val));
            }}
            className="w-full min-h-[48px] px-3.5 py-2.5 text-sm font-semibold rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100"
          >
            <option value="all">ทั้งหมด (รวมทุกขั้นตอนและทุกรอบ)</option>
            {allSummaries.map((summary) => (
              <option key={summary.id} value={summary.id}>
                {getPracticeSummaryDisplayName(summary)} {summary.status !== 'active' ? `(${summary.status})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Empty State or Metrics */}
      {!hasSessions ? (
        <div className="p-8 bg-white rounded-3xl border border-stone-200/80 text-center shadow-soft space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-primary-50 text-primary-700 flex items-center justify-center mx-auto border border-primary-200">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-800">ยังไม่มีบันทึกการปฏิบัติ</h3>
            <p className="text-stone-500 text-sm mt-1 max-w-sm mx-auto">
              เริ่มต้นก้าวแรกแห่งความเพียร ด้วยการกดปุ่มเริ่มปฏิบัติด้านล่าง หรือเพิ่มบันทึกย้อนหลัง
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/practice"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>เริ่มปฏิบัติครั้งแรก</span>
            </Link>
            <Link
              href="/history/new"
              className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              <span>เพิ่มบันทึกย้อนหลัง</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 4. Donut Chart (Month View) */}
          {periodType === 'month' && (
            <DonutChart
              practicedDays={stats.distinctDays}
              totalDays={stats.daysInPeriod}
            />
          )}

          {/* 5. Metrics Grid (4 Cards) */}
          <div className="grid grid-cols-2 gap-3">
            {/* Card 1: จำนวนวันที่ปฏิบัติ */}
            <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-soft">
              <div className="flex items-center gap-2 text-stone-500 mb-1.5">
                <Calendar className="w-4 h-4 text-primary-600" />
                <span className="text-xs font-bold">วันที่ปฏิบัติ</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-stone-800">
                  {stats.distinctDays}
                </span>
                <span className="text-xs text-stone-500 font-semibold">
                  / {stats.daysInPeriod} วัน
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-1">นับวันไม่ซ้ำ (Distinct)</p>
            </div>

            {/* Card 2: ระยะเวลารวมในรอบนี้ */}
            <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-soft">
              <div className="flex items-center gap-2 text-stone-500 mb-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold">รวมเวลาช่วงนี้</span>
              </div>
              <div className="text-lg font-black text-stone-800 leading-tight">
                {formatMinutesToThaiDuration(stats.totalPeriodMinutes)}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">เฉพาะช่วงเวลาที่เลือก</p>
            </div>

            {/* Card 3: ระยะเวลาเฉลี่ย */}
            <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-soft">
              <div className="flex items-center gap-2 text-stone-500 mb-1.5">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold">เฉลี่ยต่อวันปฏิบัติ</span>
              </div>
              <div className="text-lg font-black text-stone-800 leading-tight">
                {stats.averageMinutesPerDay > 0
                  ? `${stats.averageMinutesPerDay} นาที / วัน`
                  : '-'}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">หารเฉพาะวันที่มีการปฏิบัติ</p>
            </div>

            {/* Card 4: ระยะเวลารวมทั้งหมด (รวมเวลายกมา) */}
            <div className="p-4 bg-white rounded-3xl border border-stone-200/80 shadow-soft">
              <div className="flex items-center gap-2 text-stone-500 mb-1.5">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-bold">รวมทั้งหมดตลอดเวลา</span>
              </div>
              <div className="text-lg font-black text-stone-800 leading-tight">
                {formatMinutesToThaiDuration(stats.totalAllTimeMinutes)}
              </div>
              <p className="text-[11px] text-stone-400 mt-1">
                {stats.carriedMinutes > 0
                  ? `รวมเวลายกมา ${formatMinutesToThaiDuration(stats.carriedMinutes)}`
                  : 'รวมทุกบันทึก'}
              </p>
            </div>
          </div>

          {/* 6. Effort Evaluation Score Card */}
          <EffortCard evaluation={effortEvaluation} />

          {/* 7. Action CTA Buttons */}
          <div className="pt-2 space-y-2.5">
            <Link
              href="/practice"
              className="w-full min-h-[54px] px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-extrabold text-base shadow-elevated transition-all active:scale-[0.98] flex items-center justify-center gap-2.5"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>เริ่มปฏิบัติ</span>
            </Link>

            <Link
              href="/history/new"
              className="w-full min-h-[48px] px-6 py-3 rounded-2xl bg-white hover:bg-stone-50 text-stone-700 font-bold text-sm border-2 border-stone-200 shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-stone-500" />
              <span>เพิ่มบันทึกย้อนหลัง (Manual)</span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
