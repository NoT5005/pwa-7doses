'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStore } from '@/lib/supabase/store';
import { getPracticeSummaryDisplayName } from '@/lib/services/practice';
import { ArrowLeft, Save, Sparkles, ChevronDown } from 'lucide-react';

export default function NewManualSessionPage() {
  const router = useRouter();
  const { currentSummary, activeSummaries, createManualSession } = useStore();

  const todayStr = new Date().toISOString().split('T')[0];

  const [summaryId, setSummaryId] = useState<number>(() => {
    return currentSummary ? currentSummary.id : activeSummaries[0]?.id || 0;
  });
  const [practiceDate, setPracticeDate] = useState<string>(todayStr);
  const [hours, setHours] = useState<number>(0);
  const [minutes, setMinutes] = useState<number>(30);
  const [resultNote, setResultNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes <= 0) {
      setErrorMsg('กรุณาระบุระยะเวลาอย่างน้อย 1 นาที');
      return;
    }

    if (!summaryId) {
      setErrorMsg('กรุณาเลือกขั้นตอนการปฏิบัติ');
      return;
    }

    setIsSubmitting(true);
    try {
      await createManualSession({
        practice_summary_id: summaryId,
        practice_date: practiceDate,
        duration_minutes: totalMinutes,
        result_note: resultNote.trim() || undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setErrorMsg('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-600 hover:text-stone-900 transition-colors p-1 -ml-1"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>กลับ</span>
        </Link>
        <span className="text-xs px-3 py-1 rounded-full bg-stone-100 text-stone-700 font-bold">
          บันทึกย้อนหลัง (Manual)
        </span>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft border border-stone-200/80">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight mb-1">
          เพิ่มบันทึกการปฏิบัติ
        </h1>
        <p className="text-stone-500 text-sm mb-6">
          บันทึกข้อมูลการปฏิบัติธรรมที่เคยทำเสร็จสิ้นแล้ว
        </p>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-medium mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Step Dropdown */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">
              ขั้นตอน / รอบการปฏิบัติ <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                required
                value={summaryId}
                onChange={(e) => setSummaryId(Number(e.target.value))}
                className="w-full min-h-[52px] pl-4 pr-10 py-3 text-base font-semibold rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100 appearance-none"
              >
                {activeSummaries.map((summary) => (
                  <option key={summary.id} value={summary.id}>
                    {getPracticeSummaryDisplayName(summary)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Practice Date */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">
              วันที่ปฏิบัติ <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={practiceDate}
              onChange={(e) => setPracticeDate(e.target.value)}
              className="w-full min-h-[50px] px-4 py-3 text-base rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100"
            />
          </div>

          {/* Duration Inputs */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">
              ระยะเวลาที่ปฏิบัติ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={hours || ''}
                    onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full min-h-[50px] pl-4 pr-14 py-3 text-base font-bold rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-500 pointer-events-none">
                    ชั่วโมง
                  </span>
                </div>
              </div>

              <div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes || ''}
                    onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="30"
                    className="w-full min-h-[50px] pl-4 pr-12 py-3 text-base font-bold rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-stone-500 pointer-events-none">
                    นาที
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Result Note */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">
              บันทึกผลการปฏิบัติ
            </label>
            <textarea
              rows={4}
              value={resultNote}
              onChange={(e) => setResultNote(e.target.value)}
              placeholder="ภาวะหรือสิ่งที่เกิดขึ้นจากการปฏิบัติ (ไม่บังคับกรอก)..."
              className="w-full p-3.5 text-sm rounded-2xl border-2 border-stone-200 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 outline-none transition-all resize-none"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการปฏิบัติ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
