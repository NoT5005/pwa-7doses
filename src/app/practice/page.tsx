'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/supabase/store';
import {
  getPracticeSummaryDisplayName,
  formatSecondsToDigital,
  formatMinutesToThaiDuration,
} from '@/lib/services/practice';
import {
  calculateElapsedSeconds,
  calculateRemainingSeconds,
  checkCountUpChime,
} from '@/lib/services/timer';
import { soundService } from '@/lib/services/audio';
import { PillBadge } from '@/components/ui/PillBadge';
import { Modal } from '@/components/ui/Modal';
import {
  Play,
  Square,
  Clock,
  Sparkles,
  ArrowLeft,
  Volume2,
  Bell,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

export default function PracticePage() {
  const router = useRouter();
  const {
    currentSummary,
    activeSummaries,
    runningSession,
    startTimer,
    stopTimer,
    isLoading,
  } = useStore();

  const [selectedSummaryId, setSelectedSummaryId] = useState<number>(() => {
    return runningSession
      ? runningSession.practice_summary_id
      : currentSummary
      ? currentSummary.id
      : activeSummaries[0]?.id || 0;
  });

  const [timerMode, setTimerMode] = useState<'count_up' | 'count_down'>('count_up');
  const [countdownMinutes, setCountdownMinutes] = useState<number>(30);
  const [displaySeconds, setDisplaySeconds] = useState<number>(0);
  const [isEndingModalOpen, setIsEndingModalOpen] = useState<boolean>(false);
  const [resultNote, setResultNote] = useState<string>('');
  const [lastChimeIndex, setLastChimeIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sync selected summary when running session exists or current summary loads
  useEffect(() => {
    if (runningSession) {
      setSelectedSummaryId(runningSession.practice_summary_id);
      if (runningSession.timer_mode) {
        setTimerMode(runningSession.timer_mode);
      }
      setLastChimeIndex(runningSession.last_chime_index || 0);
    } else if (currentSummary && selectedSummaryId === 0) {
      setSelectedSummaryId(currentSummary.id);
    }
  }, [runningSession, currentSummary, selectedSummaryId]);

  // Active Timer Tick Loop (driven by absolute timestamp)
  useEffect(() => {
    if (!runningSession) {
      if (timerMode === 'count_up') {
        setDisplaySeconds(0);
      } else {
        setDisplaySeconds(countdownMinutes * 60);
      }
      return;
    }

    const interval = setInterval(() => {
      if (runningSession.timer_mode === 'count_down') {
        const { remainingSeconds, isCompleted } = calculateRemainingSeconds(
          runningSession.target_end_at
        );
        setDisplaySeconds(remainingSeconds);

        if (isCompleted) {
          // Timer finished
          soundService.playCompletionAlarm();
          clearInterval(interval);
          setIsEndingModalOpen(true);
        }
      } else {
        // count_up
        const elapsed = calculateElapsedSeconds(runningSession.started_at);
        setDisplaySeconds(elapsed);

        // Check 10-min chime boundary
        const { shouldPlay, newChimeIndex } = checkCountUpChime(elapsed, lastChimeIndex);
        if (shouldPlay) {
          soundService.playTenMinuteChime();
          setLastChimeIndex(newChimeIndex);
        }
      }
    }, 500);

    return () => clearInterval(interval);
  }, [runningSession, timerMode, countdownMinutes, lastChimeIndex]);

  const selectedSummary = useMemo(() => {
    return (
      activeSummaries.find((s) => s.id === selectedSummaryId) ||
      currentSummary ||
      activeSummaries[0]
    );
  }, [activeSummaries, selectedSummaryId, currentSummary]);

  const handleStart = async () => {
    if (!selectedSummary) return;
    soundService.unlockAudio(); // Unlock audio on first touch
    await startTimer(selectedSummary.id, timerMode, countdownMinutes);
  };

  const handleOpenStopModal = () => {
    soundService.unlockAudio();
    setIsEndingModalOpen(true);
  };

  const handleFinishAndSave = async () => {
    setIsSubmitting(true);
    try {
      await stopTimer(resultNote.trim() || undefined);
      setIsEndingModalOpen(false);
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  // If no active summaries exist
  if (activeSummaries.length === 0) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-stone-200/80 text-center shadow-soft space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-stone-800">
          ยังไม่มีขั้นตอนการปฏิบัติที่กำลังดำเนินอยู่
        </h2>
        <p className="text-stone-500 text-sm max-w-sm mx-auto">
          กรุณาเพิ่มหรือเปิดสถานะ &quot;กำลังปฏิบัติ (Active)&quot; ในหน้ารายการขั้นตอนก่อนเริ่มจับเวลา
        </p>
        <Link
          href="/steps"
          className="inline-flex min-h-[48px] px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
        >
          ไปยังหน้ารายการขั้นตอน
        </Link>
      </div>
    );
  }

  const isRunning = Boolean(runningSession);

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900 transition-colors p-1 -ml-1"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>กลับหน้าหลัก</span>
        </Link>

        <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
          {isRunning ? '● กำลังจับเวลา' : 'พร้อมเริ่มปฏิบัติ'}
        </span>
      </div>

      {/* Step Selector Dropdown (Active Summaries only) */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-soft space-y-3">
        <label className="block text-sm font-bold text-stone-700">
          ขั้นตอนการปฏิบัติ <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <select
            disabled={isRunning}
            value={selectedSummary?.id || ''}
            onChange={(e) => setSelectedSummaryId(Number(e.target.value))}
            className="w-full min-h-[52px] pl-4 pr-10 py-3 text-base font-semibold rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100 disabled:opacity-75 disabled:bg-stone-100 appearance-none"
          >
            {activeSummaries.map((summary) => (
              <option key={summary.id} value={summary.id}>
                {getPracticeSummaryDisplayName(summary)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-5 h-5 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {selectedSummary && (
          <div className="flex items-center gap-2.5 pt-1 text-xs text-stone-500">
            <PillBadge
              stepOrder={selectedSummary.step?.step_order || selectedSummary.practice_step_id}
              size="sm"
            />
            <span className="font-medium">
              รอบที่ {selectedSummary.round_number} (กำลังปฏิบัติ)
            </span>
          </div>
        )}
      </div>

      {/* Mode Selector (When not running) */}
      {!isRunning && (
        <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-soft space-y-3">
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl">
            <button
              onClick={() => {
                setTimerMode('count_up');
                setDisplaySeconds(0);
              }}
              className={`py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                timerMode === 'count_up'
                  ? 'bg-white text-primary-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>จับเวลาเดินหน้า</span>
            </button>

            <button
              onClick={() => {
                setTimerMode('count_down');
                setDisplaySeconds(countdownMinutes * 60);
              }}
              className={`py-3 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
                timerMode === 'count_down'
                  ? 'bg-white text-primary-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>นับเวลาถอยหลัง</span>
            </button>
          </div>

          {/* Preset Buttons for Count Down */}
          {timerMode === 'count_down' && (
            <div className="pt-2">
              <label className="block text-xs font-bold text-stone-600 mb-2">
                เลือกระยะเวลาที่ต้องการปฏิบัติ
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[15, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => {
                      setCountdownMinutes(mins);
                      setDisplaySeconds(mins * 60);
                    }}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all ${
                      countdownMinutes === mins
                        ? 'bg-primary-50 text-primary-800 border-primary-500 shadow-sm'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {mins} นาที
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Timer Display Hero */}
      <div className="bg-gradient-to-b from-stone-900 to-stone-950 text-white rounded-3xl p-8 shadow-elevated text-center relative overflow-hidden border border-stone-800">
        <div className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center justify-center gap-1.5">
          <Volume2 className="w-4 h-4 text-emerald-400" />
          <span>
            {timerMode === 'count_up'
              ? 'ระบบมีเสียงระฆัง "ติ๊ง" ทุก 10 นาที'
              : `นับถอยหลัง ${countdownMinutes} นาที พร้อมเสียงเตือน`}
          </span>
        </div>

        {/* Digital Time */}
        <div className="py-6 select-none">
          <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white drop-shadow-md">
            {formatSecondsToDigital(displaySeconds)}
          </div>
          <p className="text-xs text-stone-400 mt-2 font-medium">
            {isRunning
              ? runningSession?.started_at
                ? `เริ่มปฏิบัติเมื่อ ${new Date(runningSession.started_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`
                : 'กำลังจับเวลา'
              : 'เวลาในการปฏิบัติ'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="pt-4 max-w-xs mx-auto">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="w-full min-h-[60px] px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-lg shadow-lg flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>เริ่มปฏิบัติ</span>
            </button>
          ) : (
            <button
              onClick={handleOpenStopModal}
              className="w-full min-h-[60px] px-8 py-4 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-extrabold text-lg shadow-lg flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-4 focus:ring-rose-400/30"
            >
              <Square className="w-6 h-6 fill-white" />
              <span>หยุดการปฏิบัติ</span>
            </button>
          )}
        </div>

        <p className="text-xs text-stone-400 mt-6 font-medium">
          กรุณาปฏิบัติอย่างมีสติ รู้ลมหายใจและสภาวธรรมตามความเป็นจริง
        </p>
      </div>

      {/* Stop & Reflection Modal */}
      <Modal
        isOpen={isEndingModalOpen}
        onClose={() => setIsEndingModalOpen(false)}
        title="บันทึกผลการปฏิบัติ"
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-center">
            <span className="text-xs text-emerald-700 font-bold block mb-1">
              ระยะเวลาที่ปฏิบัติ
            </span>
            <span className="text-2xl font-black text-emerald-900">
              {formatMinutesToThaiDuration(Math.max(1, Math.round(displaySeconds / 60)))}
            </span>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">
              ภาวะหรือสิ่งที่เกิดขึ้นจากการปฏิบัติ
            </label>
            <textarea
              rows={4}
              value={resultNote}
              onChange={(e) => setResultNote(e.target.value)}
              placeholder="บันทึกสภาวะจิต ความสงบ หรือข้อสังเกตเพิ่มเติม (ไม่จำเป็นต้องกรอก)..."
              className="w-full p-3.5 text-sm rounded-2xl border-2 border-stone-200 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 outline-none transition-all resize-none"
            />
            <p className="text-xs text-stone-400 mt-1">
              * ข้อมูลนี้จะถูกบันทึกไว้ในประวัติการปฏิบัติของท่าน
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={handleFinishAndSave}
              disabled={isSubmitting}
              className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและจบการปฏิบัติ'}</span>
            </button>

            <button
              onClick={() => setIsEndingModalOpen(false)}
              className="w-full py-2.5 text-sm font-semibold text-stone-500 hover:text-stone-700 transition-colors"
            >
              กลับไปจับเวลาต่อ
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
