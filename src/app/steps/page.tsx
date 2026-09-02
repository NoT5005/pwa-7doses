'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/supabase/store';
import {
  suggestNextRoundNumber,
  formatMinutesToThaiDuration,
  getPracticeSummaryDisplayName,
} from '@/lib/services/practice';
import { formatThaiDate } from '@/lib/services/stats';
import { PillBadge } from '@/components/ui/PillBadge';
import { Modal } from '@/components/ui/Modal';
import { PracticeStep, PracticeSummary, PracticeStatus } from '@/types';
import {
  Layers,
  PlusCircle,
  CheckCircle2,
  Clock,
  Calendar,
  Sparkles,
  Edit2,
  Trash2,
  AlertCircle,
  Play,
} from 'lucide-react';

export default function StepsPage() {
  const {
    practiceSteps,
    practiceSummaries,
    currentSummary,
    createPracticeSummary,
    updatePracticeSummary,
    deletePracticeSummary,
    isLoading,
  } = useStore();

  // Add round modal state
  const [addingStep, setAddingStep] = useState<PracticeStep | null>(null);
  const [newRoundNumber, setNewRoundNumber] = useState<number>(1);
  const [newCarriedHours, setNewCarriedHours] = useState<number>(0);
  const [newCarriedMinutes, setNewCarriedMinutes] = useState<number>(0);
  const [newStatus, setNewStatus] = useState<PracticeStatus>('active');
  const [newStartDate, setNewStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [newEndDate, setNewEndDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Edit summary modal state
  const [editingSummary, setEditingSummary] = useState<PracticeSummary | null>(null);
  const [editStatus, setEditStatus] = useState<PracticeStatus>('active');
  const [editCarriedHours, setEditCarriedHours] = useState<number>(0);
  const [editCarriedMinutes, setEditCarriedMinutes] = useState<number>(0);
  const [editStartDate, setEditStartDate] = useState<string>('');
  const [editEndDate, setEditEndDate] = useState<string>('');

  // Delete summary state
  const [summaryToDelete, setSummaryToDelete] = useState<PracticeSummary | null>(null);

  const handleOpenAddModal = (step: PracticeStep) => {
    const nextRound = suggestNextRoundNumber(practiceSummaries, step.id);
    setAddingStep(step);
    setNewRoundNumber(nextRound);
    setNewCarriedHours(0);
    setNewCarriedMinutes(0);
    setNewStatus('active');
    setNewStartDate(new Date().toISOString().split('T')[0]);
    setNewEndDate('');
  };

  const handleSaveNewRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingStep) return;

    setIsSubmitting(true);
    try {
      const totalCarriedMinutes = newCarriedHours * 60 + newCarriedMinutes;
      await createPracticeSummary({
        practice_step_id: addingStep.id,
        round_number: newRoundNumber,
        carried_duration_minutes: totalCarriedMinutes,
        start_date: newStartDate || null,
        end_date: newEndDate || null,
        status: newStatus,
      });
      setAddingStep(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (summary: PracticeSummary) => {
    setEditingSummary(summary);
    setEditStatus(summary.status);
    const hrs = Math.floor((summary.carried_duration_minutes || 0) / 60);
    const mins = Math.round((summary.carried_duration_minutes || 0) % 60);
    setEditCarriedHours(hrs);
    setEditCarriedMinutes(mins);
    setEditStartDate(summary.start_date || '');
    setEditEndDate(summary.end_date || '');
  };

  const handleSaveEditSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSummary) return;

    setIsSubmitting(true);
    try {
      const totalCarriedMinutes = editCarriedHours * 60 + editCarriedMinutes;
      await updatePracticeSummary(editingSummary.id, {
        status: editStatus,
        carried_duration_minutes: totalCarriedMinutes,
        start_date: editStartDate || null,
        end_date: editEndDate || null,
      });
      setEditingSummary(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSummary = async () => {
    if (!summaryToDelete) return;
    setIsSubmitting(true);
    await deletePracticeSummary(summaryToDelete.id);
    setIsSubmitting(false);
    setSummaryToDelete(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-stone-800 tracking-tight">
          ขั้นตอนการปฏิบัติ (7 ขั้น)
        </h1>
        <p className="text-xs text-stone-500 font-medium mt-0.5">
          จัดการรอบ สถานะ และเวลายกมาในแต่ละขั้นตอน
        </p>
      </div>

      {/* Steps List */}
      <div className="space-y-4">
        {practiceSteps.map((step) => {
          const summariesForStep = practiceSummaries
            .filter((s) => s.practice_step_id === step.id)
            .sort((a, b) => a.round_number - b.round_number);

          const hasData = summariesForStep.length > 0;
          const isCurrentStep =
            currentSummary && currentSummary.practice_step_id === step.id;

          return (
            <div
              key={step.id}
              className={`bg-white rounded-3xl p-5 border shadow-soft transition-all ${
                isCurrentStep
                  ? 'border-2 border-primary-500/80 ring-4 ring-primary-50'
                  : 'border-stone-200/80'
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <PillBadge stepOrder={step.step_order} size="lg" />
                  <div>
                    <span className="text-xs font-bold text-stone-400 block uppercase tracking-wider">
                      ขั้นที่ {step.step_order}
                    </span>
                    <h2 className="text-lg font-bold text-stone-800 leading-snug">
                      {step.step_name}
                    </h2>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isCurrentStep && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-primary-100 text-primary-800 font-bold border border-primary-200">
                      ขั้นตอนปัจจุบัน
                    </span>
                  )}
                </div>
              </div>

              {/* Rounds List inside step */}
              <div className="mt-4 pt-3 border-t border-stone-100 space-y-2.5">
                {!hasData ? (
                  <div className="py-2 flex items-center justify-between text-xs text-stone-400">
                    <span>○ ยังไม่มีข้อมูลในขั้นตอนนี้</span>
                    <button
                      onClick={() => handleOpenAddModal(step)}
                      className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>เพิ่มรอบ 1</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {summariesForStep.map((summary) => {
                      const isSummaryCurrent = currentSummary?.id === summary.id;

                      return (
                        <div
                          key={summary.id}
                          className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-stone-800">
                                รอบที่ {summary.round_number}
                              </span>

                              {summary.status === 'active' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                                  {isSummaryCurrent ? '● กำลังปฏิบัติ (Current)' : 'กำลังปฏิบัติ'}
                                </span>
                              )}
                              {summary.status === 'paused' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">
                                  ⏸ พักไว้
                                </span>
                              )}
                              {summary.status === 'completed' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-bold flex items-center gap-1">
                                  ✓ เสร็จสิ้น
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                              {summary.carried_duration_minutes > 0 && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  เวลายกมา: {formatMinutesToThaiDuration(summary.carried_duration_minutes)}
                                </span>
                              )}
                              {summary.start_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-stone-400" />
                                  เริ่ม: {formatThaiDate(summary.start_date)}
                                </span>
                              )}
                              {summary.end_date && (
                                <span className="flex items-center gap-1">
                                  สิ้นสุด: {formatThaiDate(summary.end_date)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 self-end sm:self-center">
                            <button
                              onClick={() => handleOpenEditModal(summary)}
                              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
                              title="แก้ไขข้อมูลรอบ"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setSummaryToDelete(summary)}
                              className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                              title="ลบรอบนี้"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      onClick={() => handleOpenAddModal(step)}
                      className="w-full py-2.5 px-3 rounded-2xl bg-stone-100/70 hover:bg-stone-200/80 text-stone-600 font-bold text-xs border border-dashed border-stone-300 transition-colors flex items-center justify-center gap-1.5 mt-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>เพิ่มรอบถัดไป (รอบ {suggestNextRoundNumber(practiceSummaries, step.id)})</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Round Modal */}
      <Modal
        isOpen={Boolean(addingStep)}
        onClose={() => setAddingStep(null)}
        title={addingStep ? `เพิ่มรอบ: ${addingStep.step_name}` : ''}
      >
        {addingStep && (
          <form onSubmit={handleSaveNewRound} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                รอบที่ (Round Number) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={newRoundNumber}
                onChange={(e) => setNewRoundNumber(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                สถานะการปฏิบัติ <span className="text-red-500">*</span>
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as PracticeStatus)}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 font-bold"
              >
                <option value="active">กำลังปฏิบัติ (Active)</option>
                <option value="paused">พักไว้ (Paused)</option>
                <option value="completed">เสร็จสิ้น (Completed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                เวลายกมา (ที่เคยปฏิบัติมาก่อนเริ่มใช้ App)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="ชั่วโมง"
                  value={newCarriedHours || ''}
                  onChange={(e) => setNewCarriedHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 text-sm font-bold"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="นาที"
                  value={newCarriedMinutes || ''}
                  onChange={(e) => setNewCarriedMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 text-sm font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  วันที่เริ่ม
                </label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[50px] px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'เพิ่มรอบการปฏิบัติ'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Summary Modal */}
      <Modal
        isOpen={Boolean(editingSummary)}
        onClose={() => setEditingSummary(null)}
        title="แก้ไขข้อมูลรอบการปฏิบัติ"
      >
        {editingSummary && (
          <form onSubmit={handleSaveEditSummary} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                สถานะการปฏิบัติ <span className="text-red-500">*</span>
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as PracticeStatus)}
                className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 font-bold"
              >
                <option value="active">กำลังปฏิบัติ (Active)</option>
                <option value="paused">พักไว้ (Paused)</option>
                <option value="completed">เสร็จสิ้น (Completed)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                เวลายกมา (ชั่วโมง และ นาที)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="ชั่วโมง"
                  value={editCarriedHours || ''}
                  onChange={(e) => setEditCarriedHours(Math.max(0, parseInt(e.target.value) || 0))}
                  className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 text-sm font-bold"
                />
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="นาที"
                  value={editCarriedMinutes || ''}
                  onChange={(e) => setEditCarriedMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 text-sm font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  วันที่เริ่ม
                </label>
                <input
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  วันที่สิ้นสุด
                </label>
                <input
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full min-h-[48px] px-3 py-2 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[50px] px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Summary Confirm Modal */}
      <Modal
        isOpen={Boolean(summaryToDelete)}
        onClose={() => setSummaryToDelete(null)}
        title="ยืนยันการลบรอบการปฏิบัติ"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-stone-800">
              ต้องการลบรอบนี้หรือไม่?
            </h3>
            <p className="text-stone-500 text-xs mt-1 leading-relaxed">
              การลบจะทำให้บันทึก (Transactions) ที่ผูกอยู่กับรอบนี้ถูกลบออกไปด้วย
            </p>
          </div>

          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => setSummaryToDelete(null)}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDeleteSummary}
              disabled={isSubmitting}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'กำลังลบ...' : 'ยืนยันลบ'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
