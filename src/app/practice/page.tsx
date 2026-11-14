'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/supabase/store';
import {
  getPracticeSummaryDisplayName,
  formatSecondsToDigital,
  formatMinutesToThaiDuration,
} from '@/lib/services/practice';
import {
  calculateSessionDisplayState,
  checkCountUpChime,
  isSessionPaused,
} from '@/lib/services/timer';
import { soundService } from '@/lib/services/audio';
import { PillBadge } from '@/components/ui/PillBadge';
import { Modal } from '@/components/ui/Modal';
import {
  Play,
  Pause,
  Square,
  Clock,
  Sparkles,
  ArrowLeft,
  Volume2,
  Bell,
  CheckCircle2,
  ChevronDown,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';

export default function PracticePage() {
  const router = useRouter();
  const {
    currentSummary,
    activeSummaries,
    runningSession,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    cancelTimer,
    updateTimerChimeIndex,
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
  const [activeElapsedSeconds, setActiveElapsedSeconds] = useState<number>(0);
  const [isEndingModalOpen, setIsEndingModalOpen] = useState<boolean>(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState<boolean>(false);
  const [resultNote, setResultNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isTestingChime, setIsTestingChime] = useState<boolean>(false);
  const [chimeBannerText, setChimeBannerText] = useState<string | null>(null);
  const [isNativeFullscreen, setIsNativeFullscreen] = useState<boolean>(false);

  const lastChimeIndexRef = useRef<number>(0);
  const completionTriggeredRef = useRef<boolean>(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const testChimeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isRunning = Boolean(runningSession);
  const isPaused = isSessionPaused(runningSession);

  // Sync Native Fullscreen state
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onFsChange = () => {
      setIsNativeFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const enterNativeFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    try {
      const docEl = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
      }
    } catch {
      // Gracefully ignore on browsers (such as iOS Safari tab) where Fullscreen API is restricted;
      // the fixed inset-0 z-[90] full-viewport screen still covers 100% of the screen.
    }
  }, []);

  const exitNativeFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch {
      // Ignore
    }
  }, []);

  // Screen Wake Lock & Audio Keep-Alive while actively meditating (not paused)
  useEffect(() => {
    let active = true;

    const acquireWakeLock = async () => {
      if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch {
        // Wake lock may fail on low battery or background tab
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // ignore
        }
        wakeLockRef.current = null;
      }
    };

    if (isRunning && !isPaused) {
      acquireWakeLock();
      soundService.startKeepAlive();
    } else {
      releaseWakeLock();
      soundService.stopKeepAlive();
    }

    const handleVisibility = () => {
      if (active && document.visibilityState === 'visible' && isRunning && !isPaused) {
        acquireWakeLock();
        soundService.startKeepAlive();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (!isRunning) {
        releaseWakeLock();
        soundService.stopKeepAlive();
      }
    };
  }, [isRunning, isPaused]);

  // Sync selected summary & chime index when running session loads or changes
  useEffect(() => {
    if (runningSession) {
      setSelectedSummaryId(runningSession.practice_summary_id);
      if (runningSession.timer_mode) {
        setTimerMode(runningSession.timer_mode);
      }
      lastChimeIndexRef.current = runningSession.last_chime_index || 0;
    } else {
      lastChimeIndexRef.current = 0;
      completionTriggeredRef.current = false;
      if (currentSummary && selectedSummaryId === 0) {
        setSelectedSummaryId(currentSummary.id);
      }
    }
  }, [runningSession, currentSummary, selectedSummaryId]);

  // Active Timer Tick Loop (driven by exact timestamps & accumulated seconds)
  useEffect(() => {
    if (!runningSession) {
      setActiveElapsedSeconds(0);
      if (timerMode === 'count_up') {
        setDisplaySeconds(0);
      } else {
        setDisplaySeconds(countdownMinutes * 60);
      }
      return;
    }

    const tick = () => {
      const state = calculateSessionDisplayState(runningSession);
      setDisplaySeconds(state.displaySeconds);
      setActiveElapsedSeconds(state.activeElapsedSeconds);

      if (state.isPaused) return;

      // Check completion in count_down mode
      if (runningSession.timer_mode === 'count_down' && state.isCompleted) {
        if (!completionTriggeredRef.current) {
          completionTriggeredRef.current = true;
          soundService.playCompletionAlarm();
          pauseTimer();
          setIsEndingModalOpen(true);
        }
        return;
      }

      // Check 10-minute (600s) temple bell chime on active elapsed seconds
      // In count_down mode, skip if <= 5 seconds remain so it doesn't overlap completion alarm
      const allowChime =
        runningSession.timer_mode === 'count_up' || state.displaySeconds > 5;

      if (allowChime) {
        const { shouldPlay, newChimeIndex } = checkCountUpChime(
          state.activeElapsedSeconds,
          lastChimeIndexRef.current
        );
        if (shouldPlay) {
          lastChimeIndexRef.current = newChimeIndex;
          soundService.playTenMinuteChime();
          updateTimerChimeIndex(newChimeIndex);
          setChimeBannerText(`ครบ ${newChimeIndex * 10} นาทีแล้ว`);
          setTimeout(() => setChimeBannerText(null), 6000);
        }
      }
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [runningSession, timerMode, countdownMinutes, pauseTimer, updateTimerChimeIndex]);

  const selectedSummary = useMemo(() => {
    return (
      activeSummaries.find((s) => s.id === selectedSummaryId) ||
      runningSession?.summary ||
      currentSummary ||
      activeSummaries[0]
    );
  }, [activeSummaries, selectedSummaryId, runningSession?.summary, currentSummary]);

  const handleTestChime = async () => {
    setIsTestingChime(true);
    await soundService.playTestChime();
    if (testChimeTimeoutRef.current) clearTimeout(testChimeTimeoutRef.current);
    testChimeTimeoutRef.current = setTimeout(() => {
      setIsTestingChime(false);
    }, 3400);
  };

  const handleStart = async () => {
    if (!selectedSummary) return;
    soundService.unlockAudio();
    soundService.startKeepAlive();
    completionTriggeredRef.current = false;
    lastChimeIndexRef.current = 0;
    enterNativeFullscreen();
    await startTimer(selectedSummary.id, timerMode, countdownMinutes);
  };

  const handlePause = async () => {
    soundService.stopKeepAlive();
    await pauseTimer();
  };

  const handleResume = async () => {
    soundService.unlockAudio();
    soundService.startKeepAlive();
    enterNativeFullscreen();
    await resumeTimer();
  };

  const handleOpenStopModal = async () => {
    soundService.unlockAudio();
    if (!isPaused) {
      await pauseTimer();
    }
    setIsEndingModalOpen(true);
  };

  const handleFinishAndSave = async () => {
    setIsSubmitting(true);
    try {
      soundService.stopKeepAlive();
      await stopTimer(resultNote.trim() || undefined);
      setIsEndingModalOpen(false);
      setResultNote('');
      await exitNativeFullscreen();
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelDiscard = async () => {
    setIsSubmitting(true);
    try {
      soundService.stopKeepAlive();
      await cancelTimer();
      setIsCancelConfirmOpen(false);
      setIsEndingModalOpen(false);
      setResultNote('');
      await exitNativeFullscreen();
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

  // If no active summaries exist and no running session
  if (activeSummaries.length === 0 && !isRunning) {
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

  const effectiveMinutesForSave = Math.max(1, Math.round(activeElapsedSeconds / 60));

  return (
    <>
      {/* ==================================================================== */}
      {/* 1. SETUP VIEW (Before starting practice)                             */}
      {/* ==================================================================== */}
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
            พร้อมเริ่มปฏิบัติ
          </span>
        </div>

        {/* Step Selector Dropdown */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-soft space-y-3">
          <label className="block text-sm font-bold text-stone-700">
            ขั้นตอนการปฏิบัติ <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              disabled={isRunning}
              value={selectedSummary?.id || ''}
              onChange={(e) => setSelectedSummaryId(Number(e.target.value))}
              className="w-full min-h-[54px] pl-4 pr-10 py-3 text-base font-semibold rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100 disabled:opacity-75 disabled:bg-stone-100 appearance-none"
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

        {/* Mode Selector & Sound Test Card */}
        <div className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-soft space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl">
            <button
              type="button"
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
              type="button"
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
            <div className="pt-1">
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
                    className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all ${
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

          {/* Test Chime Button for Volume Adjustment */}
          <div className="pt-1 border-t border-stone-100">
            <button
              type="button"
              onClick={handleTestChime}
              className={`w-full min-h-[52px] px-4 py-3 rounded-2xl border-2 font-bold text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] ${
                isTestingChime
                  ? 'bg-amber-50 border-amber-400 text-amber-900 ring-4 ring-amber-100'
                  : 'bg-stone-50 hover:bg-amber-50/60 border-stone-200 text-stone-700'
              }`}
            >
              <Volume2
                className={`w-5 h-5 ${
                  isTestingChime ? 'text-amber-600 animate-bounce' : 'text-primary-700'
                }`}
              />
              <span>
                {isTestingChime
                  ? 'กำลังดัง... กดปุ่มเพิ่ม-ลดเสียงข้างโทรศัพท์ได้เลย'
                  : 'ทดสอบเสียงระฆัง (ปรับความดังก่อนเริ่ม)'}
              </span>
            </button>
          </div>
        </div>

        {/* Main Start Timer Card */}
        <div className="bg-gradient-to-b from-stone-900 to-stone-950 text-white rounded-3xl p-8 shadow-elevated text-center relative overflow-hidden border border-stone-800">
          <div className="text-xs font-bold text-stone-300 mb-3 flex items-center justify-center gap-1.5">
            <Bell className="w-4 h-4 text-amber-400" />
            <span>
              {timerMode === 'count_up'
                ? 'เสียงระฆังเตือนทุก 10 นาที • แสดงผลเต็มหน้าจอ'
                : `นับถอยหลัง ${countdownMinutes} นาที • แสดงผลเต็มหน้าจอ`}
            </span>
          </div>

          <div className="py-5 select-none">
            <div className="text-6xl sm:text-7xl font-black font-mono tracking-tight text-white drop-shadow-md">
              {formatSecondsToDigital(displaySeconds)}
            </div>
            <p className="text-xs text-stone-400 mt-2 font-medium">
              เมื่อกดเริ่มปฏิบัติ หน้าจับเวลาจะขยายเต็มหน้าจอโดยอัตโนมัติ
            </p>
          </div>

          <div className="pt-4 max-w-xs mx-auto">
            <button
              type="button"
              onClick={handleStart}
              className="w-full min-h-[64px] px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-xl shadow-lg flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
            >
              <Play className="w-6 h-6 fill-white" />
              <span>เริ่มปฏิบัติ</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. FULL-SCREEN MEDITATION TIMER OVERLAY (When Active or Paused)      */}
      {/* ==================================================================== */}
      {isRunning && (
        <div
          className="fixed inset-0 z-[90] w-screen h-[100dvh] bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 text-white flex flex-col justify-between overflow-y-auto overscroll-contain select-none px-5 py-6"
          style={{
            paddingTop: 'max(env(safe-area-inset-top, 16px), 20px)',
            paddingBottom: 'max(env(safe-area-inset-bottom, 20px), 24px)',
          }}
        >
          {/* Top Status & Quick Sound/Fullscreen Bar */}
          <div className="w-full max-w-lg mx-auto flex items-center justify-between gap-2">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold border ${
                isPaused
                  ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              <span>{isPaused ? 'พักการปฏิบัติชั่วคราว' : 'กำลังปฏิบัติธรรม'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleTestChime}
                className="min-h-[42px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-stone-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
                title="ทดสอบเสียงระฆัง"
              >
                <Volume2 className={`w-4 h-4 ${isTestingChime ? 'text-amber-300 animate-bounce' : 'text-amber-400'}`} />
                <span>ทดสอบเสียง</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  isNativeFullscreen ? exitNativeFullscreen() : enterNativeFullscreen()
                }
                className="min-h-[42px] p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-stone-300 border border-white/10 transition-colors"
                aria-label="สลับโหมดเต็มหน้าจอ"
              >
                {isNativeFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Center Meditation Step & Giant Clock */}
          <div className="w-full max-w-lg mx-auto my-auto py-6 text-center space-y-6">
            {/* Step Info */}
            {selectedSummary && (
              <div className="inline-flex flex-col items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 max-w-full">
                <div className="flex items-center gap-2">
                  <PillBadge
                    stepOrder={
                      selectedSummary.step?.step_order || selectedSummary.practice_step_id
                    }
                    size="sm"
                  />
                  <span className="text-xs font-bold text-amber-300">
                    รอบที่ {selectedSummary.round_number}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-stone-100 leading-snug">
                  {selectedSummary.step?.step_name ||
                    getPracticeSummaryDisplayName(selectedSummary)}
                </h2>
              </div>
            )}

            {/* 10-Minute Chime Status */}
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold text-stone-300">
                <Bell className="w-4 h-4 text-amber-400" />
                <span>
                  เสียงระฆังเตือนทุก 10 นาที
                  {lastChimeIndexRef.current > 0
                    ? ` (ดังแล้ว ${lastChimeIndexRef.current} ครั้ง)`
                    : ''}
                </span>
              </div>

              {chimeBannerText && (
                <div className="mx-auto max-w-xs py-1.5 px-4 rounded-full bg-amber-400/20 border border-amber-300/40 text-amber-200 text-sm font-bold animate-pulse">
                  🔔 {chimeBannerText}
                </div>
              )}
            </div>

            {/* Giant Timer Digits */}
            <div className="py-4">
              <div
                className={`text-6xl sm:text-8xl font-black font-mono tracking-wider transition-opacity ${
                  isPaused ? 'text-amber-200 opacity-90' : 'text-white'
                }`}
              >
                {formatSecondsToDigital(displaySeconds)}
              </div>

              <p className="text-sm text-stone-400 mt-3 font-medium">
                {isPaused
                  ? `หยุดพักเวลาชั่วคราว (ปฏิบัติไปแล้ว ${formatSecondsToDigital(
                      activeElapsedSeconds
                    )})`
                  : runningSession?.created_at
                  ? `เริ่มปฏิบัติเมื่อ ${new Date(runningSession.created_at).toLocaleTimeString(
                      'th-TH',
                      { hour: '2-digit', minute: '2-digit' }
                    )} น.`
                  : 'กำลังจับเวลาอย่างมีสติ'}
              </p>
            </div>
          </div>

          {/* Bottom Senior-Friendly Controls: Pause / Resume / Stop Decision */}
          <div className="w-full max-w-md mx-auto space-y-3">
            {!isPaused ? (
              <>
                <button
                  type="button"
                  onClick={handlePause}
                  className="w-full min-h-[64px] px-8 py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-stone-950 font-extrabold text-xl shadow-lg flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-4 focus:ring-amber-300/40"
                >
                  <Pause className="w-6 h-6 fill-stone-950" />
                  <span>พักการปฏิบัติ</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenStopModal}
                  className="w-full min-h-[54px] px-6 py-3 rounded-2xl bg-white/10 hover:bg-rose-600/30 active:scale-[0.98] text-rose-200 font-bold text-base border border-rose-400/30 flex items-center justify-center gap-2.5 transition-all"
                >
                  <Square className="w-5 h-5 fill-rose-300 text-rose-300" />
                  <span>จบการปฏิบัติและบันทึกผล</span>
                </button>
              </>
            ) : (
              <div className="p-4 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                <p className="text-center text-sm font-bold text-amber-200 pb-1">
                  หยุดพักเวลาไว้ชั่วคราว กรุณาเลือกสิ่งที่ต้องการทำต่อ
                </p>

                <button
                  type="button"
                  onClick={handleResume}
                  className="w-full min-h-[64px] px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-extrabold text-xl shadow-lg flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-400/30"
                >
                  <Play className="w-6 h-6 fill-white" />
                  <span>ปฏิบัติต่อ</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenStopModal}
                  className="w-full min-h-[58px] px-8 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white font-extrabold text-lg shadow-lg flex items-center justify-center gap-3 transition-all focus:outline-none focus:ring-4 focus:ring-rose-400/30"
                >
                  <Square className="w-5 h-5 fill-white" />
                  <span>หยุดเลย (ไปหน้าบันทึกผล)</span>
                </button>

                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setIsCancelConfirmOpen(true)}
                    className="inline-flex items-center gap-1.5 py-2 px-3 text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>ยกเลิกการปฏิบัติครั้งนี้ (ไม่บันทึก)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. STOP & REFLECTION SAVE MODAL                                      */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isEndingModalOpen}
        onClose={() => setIsEndingModalOpen(false)}
        title="บันทึกผลการปฏิบัติ"
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-center">
            <span className="text-xs text-emerald-700 font-bold block mb-1">
              ระยะเวลาที่ปฏิบัติจริง
            </span>
            <span className="text-2xl font-black text-emerald-900">
              {formatMinutesToThaiDuration(effectiveMinutesForSave)}
            </span>
            <span className="text-xs text-emerald-700/80 block mt-0.5 font-mono">
              ({formatSecondsToDigital(activeElapsedSeconds)})
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
              className="w-full p-3.5 text-base rounded-2xl border-2 border-stone-200 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 outline-none transition-all resize-none"
            />
            <p className="text-xs text-stone-400 mt-1">
              * ข้อมูลนี้จะถูกบันทึกและซิงค์ไว้ในประวัติการปฏิบัติของท่าน
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <button
              type="button"
              onClick={handleFinishAndSave}
              disabled={isSubmitting}
              className="w-full min-h-[54px] px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและจบการปฏิบัติ'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsEndingModalOpen(false)}
              className="w-full min-h-[48px] py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-sm font-bold text-stone-700 transition-colors"
            >
              ย้อนกลับไปหน้าจับเวลา (ยังไม่บันทึก)
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================================================================== */}
      {/* 4. DISCARD CONFIRMATION MODAL                                        */}
      {/* ==================================================================== */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        title="ยืนยันการยกเลิก"
        maxWidth="sm"
      >
        <div className="space-y-4 text-center">
          <p className="text-sm text-stone-600 leading-relaxed">
            ต้องการยกเลิกการจับเวลาครั้งนี้โดย<strong>ไม่บันทึกประวัติ</strong>ใช่หรือไม่?
          </p>
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={handleCancelDiscard}
              disabled={isSubmitting}
              className="w-full min-h-[50px] px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98]"
            >
              ยืนยัน ยกเลิกโดยไม่บันทึก
            </button>
            <button
              type="button"
              onClick={() => setIsCancelConfirmOpen(false)}
              className="w-full min-h-[46px] py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-sm font-bold text-stone-700 transition-colors"
            >
              กลับไปหน้าจับเวลา
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
