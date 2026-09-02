'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/supabase/store';
import { DEFAULT_EFFORT_SETTINGS } from '@/types';
import { ArrowLeft, Save, RotateCcw, Sliders, CheckCircle2 } from 'lucide-react';

export default function EffortSettingsPage() {
  const router = useRouter();
  const { effortSettings, updateEffortSettings, resetEffortSettings } = useStore();

  const [goodDaysMin, setGoodDaysMin] = useState<number>(effortSettings.good_days_min);
  const [moderateDaysMin, setModerateDaysMin] = useState<number>(effortSettings.moderate_days_min);

  const [excellentMinsMin, setExcellentMinsMin] = useState<number>(effortSettings.excellent_minutes_min);
  const [goodMinsMin, setGoodMinsMin] = useState<number>(effortSettings.good_minutes_min);
  const [moderateMinsMin, setModerateMinsMin] = useState<number>(effortSettings.moderate_minutes_min);

  const [dayWeight, setDayWeight] = useState<number>(effortSettings.day_weight);
  const [durationWeight, setDurationWeight] = useState<number>(effortSettings.duration_weight);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateEffortSettings({
        good_days_min: goodDaysMin,
        moderate_days_min: moderateDaysMin,
        excellent_minutes_min: excellentMinsMin,
        good_minutes_min: goodMinsMin,
        moderate_minutes_min: moderateMinsMin,
        day_weight: dayWeight,
        duration_weight: durationWeight,
      });
      setSuccessMsg('บันทึกเกณฑ์ประเมินเรียบร้อยแล้ว');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsSubmitting(true);
    try {
      await resetEffortSettings();
      setGoodDaysMin(DEFAULT_EFFORT_SETTINGS.good_days_min);
      setModerateDaysMin(DEFAULT_EFFORT_SETTINGS.moderate_days_min);
      setExcellentMinsMin(DEFAULT_EFFORT_SETTINGS.excellent_minutes_min);
      setGoodMinsMin(DEFAULT_EFFORT_SETTINGS.good_minutes_min);
      setModerateMinsMin(DEFAULT_EFFORT_SETTINGS.moderate_minutes_min);
      setDayWeight(DEFAULT_EFFORT_SETTINGS.day_weight);
      setDurationWeight(DEFAULT_EFFORT_SETTINGS.duration_weight);

      setSuccessMsg('คืนค่าเริ่มต้นเรียบร้อยแล้ว');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900 transition-colors p-1 -ml-1"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>กลับไปหน้าตั้งค่า</span>
        </Link>
        <span className="text-xs px-3 py-1 rounded-full bg-stone-100 text-stone-700 font-bold">
          เกณฑ์ประเมิน
        </span>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft border border-stone-200/80 space-y-6">
        <div>
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
            <Sliders className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight mb-1">
            เกณฑ์ประเมินความเพียร
          </h1>
          <p className="text-stone-500 text-sm">
            ปรับแต่งเกณฑ์คะแนนตามความเหมาะสมและเป้าหมายส่วนบุคคล
          </p>
        </div>

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Day Thresholds */}
          <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
            <h3 className="text-sm font-bold text-stone-800">
              1. เกณฑ์จำนวนวันที่มีการปฏิบัติ (ต่อเดือน)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  เกณฑ์ระดับ &quot;ดี&quot; (ขั้นต่ำ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={goodDaysMin}
                    onChange={(e) => setGoodDaysMin(parseInt(e.target.value) || 1)}
                    className="w-full min-h-[46px] px-3.5 py-2 text-sm font-bold rounded-xl bg-white border border-stone-300 text-stone-800 focus:outline-none focus:border-primary-600"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                    วัน
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  เกณฑ์ระดับ &quot;ค่อนข้างน้อย&quot;
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={moderateDaysMin}
                    onChange={(e) => setModerateDaysMin(parseInt(e.target.value) || 1)}
                    className="w-full min-h-[46px] px-3.5 py-2 text-sm font-bold rounded-xl bg-white border border-stone-300 text-stone-800 focus:outline-none focus:border-primary-600"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                    วัน
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-stone-400">
              * ระดับ &quot;ดีมาก&quot; คือปฏิบัติครบทุกวันของเดือนนั้นๆ
            </p>
          </div>

          {/* 2. Duration Thresholds */}
          <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
            <h3 className="text-sm font-bold text-stone-800">
              2. เกณฑ์ระยะเวลาเฉลี่ย (นาที / วันที่มีการปฏิบัติ)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  ดีมาก (นาที)
                </label>
                <input
                  type="number"
                  min="1"
                  value={excellentMinsMin}
                  onChange={(e) => setExcellentMinsMin(parseInt(e.target.value) || 1)}
                  className="w-full min-h-[46px] px-3 py-2 text-sm font-bold rounded-xl bg-white border border-stone-300 text-stone-800 text-center focus:outline-none focus:border-primary-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  ดี (นาที)
                </label>
                <input
                  type="number"
                  min="1"
                  value={goodMinsMin}
                  onChange={(e) => setGoodMinsMin(parseInt(e.target.value) || 1)}
                  className="w-full min-h-[46px] px-3 py-2 text-sm font-bold rounded-xl bg-white border border-stone-300 text-stone-800 text-center focus:outline-none focus:border-primary-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                  ค่อนข้างดี (นาที)
                </label>
                <input
                  type="number"
                  min="1"
                  value={moderateMinsMin}
                  onChange={(e) => setModerateMinsMin(parseInt(e.target.value) || 1)}
                  className="w-full min-h-[46px] px-3 py-2 text-sm font-bold rounded-xl bg-white border border-stone-300 text-stone-800 text-center focus:outline-none focus:border-primary-600"
                />
              </div>
            </div>
          </div>

          {/* 3. Weighting */}
          <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200/70">
            <h3 className="text-sm font-bold text-stone-800">
              3. สัดส่วนน้ำหนักคะแนน (รวมกันเท่ากับ 1.0 หรือ 100%)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  น้ำหนักจำนวนวัน ({Math.round(dayWeight * 100)}%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={dayWeight}
                  onChange={(e) => {
                    const dw = parseFloat(e.target.value) || 0;
                    setDayWeight(dw);
                    setDurationWeight(Math.max(0, Math.round((1 - dw) * 100) / 100));
                  }}
                  className="w-full min-h-[46px] px-3.5 py-2 text-sm font-bold rounded-xl bg-white border border-stone-300 text-stone-800 text-center focus:outline-none focus:border-primary-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  น้ำหนักระยะเวลา ({Math.round(durationWeight * 100)}%)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={durationWeight}
                  onChange={(e) => {
                    const durW = parseFloat(e.target.value) || 0;
                    setDurationWeight(durW);
                    setDayWeight(Math.max(0, Math.round((1 - durW) * 100) / 100));
                  }}
                  className="w-full min-h-[46px] px-3.5 py-2 text-sm font-bold rounded-xl bg-white border border-stone-300 text-stone-800 text-center focus:outline-none focus:border-primary-600"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 space-y-2.5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={isSubmitting}
              className="w-full min-h-[48px] px-6 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-stone-500" />
              <span>คืนค่าเริ่มต้น</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
