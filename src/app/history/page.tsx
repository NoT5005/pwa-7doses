'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/supabase/store';
import {
  getPracticeSummaryDisplayName,
  formatMinutesToThaiDuration,
} from '@/lib/services/practice';
import { formatThaiDate } from '@/lib/services/stats';
import { PillBadge } from '@/components/ui/PillBadge';
import { Modal } from '@/components/ui/Modal';
import { PracticeSession } from '@/types';
import {
  PlusCircle,
  Clock,
  Calendar,
  Trash2,
  Edit3,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  FileText,
} from 'lucide-react';

export default function HistoryPage() {
  const {
    practiceSessions,
    allSummaries,
    deleteSession,
    updateSession,
    isLoading,
  } = useStore();

  const [selectedSummaryFilter, setSelectedSummaryFilter] = useState<number | 'all'>('all');
  const [sessionToDelete, setSessionToDelete] = useState<PracticeSession | null>(null);
  const [sessionToEdit, setSessionToEdit] = useState<PracticeSession | null>(null);
  const [editNote, setEditNote] = useState<string>('');
  const [editMinutes, setEditMinutes] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Filter completed sessions and sort reverse chronological
  const filteredSessions = useMemo(() => {
    return practiceSessions
      .filter((s) => {
        if (s.session_status !== 'completed') return false;
        if (selectedSummaryFilter !== 'all' && s.practice_summary_id !== selectedSummaryFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by practice_date desc, then by id desc
        if (a.practice_date !== b.practice_date) {
          return b.practice_date.localeCompare(a.practice_date);
        }
        return b.id - a.id;
      });
  }, [practiceSessions, selectedSummaryFilter]);

  const handleDeleteConfirm = async () => {
    if (!sessionToDelete) return;
    setIsProcessing(true);
    await deleteSession(sessionToDelete.id);
    setIsProcessing(false);
    setSessionToDelete(null);
  };

  const handleStartEdit = (session: PracticeSession) => {
    setSessionToEdit(session);
    setEditNote(session.result_note || '');
    setEditMinutes(Math.round((session.duration_seconds || 0) / 60));
  };

  const handleSaveEdit = async () => {
    if (!sessionToEdit) return;
    setIsProcessing(true);
    await updateSession(sessionToEdit.id, {
      result_note: editNote.trim() || null,
      duration_seconds: Math.max(60, editMinutes * 60),
    });
    setIsProcessing(false);
    setSessionToEdit(null);
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
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-800 tracking-tight">
            ประวัติการปฏิบัติ
          </h1>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            บันทึกความเพียรทั้งหมด เรียงตามวันเวลาล่าสุด
          </p>
        </div>

        <Link
          href="/history/new"
          className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>เพิ่มบันทึก</span>
        </Link>
      </div>

      {/* Filter Dropdown */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-soft">
        <label className="block text-xs font-bold text-stone-600 mb-1.5">
          กรองตามขั้นตอน / รอบ
        </label>
        <div className="relative">
          <select
            value={selectedSummaryFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedSummaryFilter(val === 'all' ? 'all' : Number(val));
            }}
            className="w-full min-h-[48px] pl-3.5 pr-10 py-2.5 text-sm font-semibold rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100 appearance-none"
          >
            <option value="all">ทั้งหมด ({filteredSessions.length} รายการ)</option>
            {allSummaries.map((summary) => (
              <option key={summary.id} value={summary.id}>
                {getPracticeSummaryDisplayName(summary)}
              </option>
            ))}
          </select>
          <ChevronDown className="w-5 h-5 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Session List */}
      {filteredSessions.length === 0 ? (
        <div className="p-8 bg-white rounded-3xl border border-stone-200/80 text-center shadow-soft space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-stone-700">ไม่มีรายการบันทึก</h3>
          <p className="text-stone-400 text-xs max-w-xs mx-auto">
            ยังไม่มีข้อมูลการปฏิบัติในขั้นตอนที่เลือก
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const summary = allSummaries.find((s) => s.id === session.practice_summary_id);
            const stepOrder = summary?.step?.step_order || summary?.practice_step_id || 1;
            const durationMins = Math.round((session.duration_seconds || 0) / 60);

            return (
              <div
                key={session.id}
                className="bg-white rounded-3xl p-5 border border-stone-200/80 shadow-soft space-y-3 hover:border-stone-300 transition-all"
              >
                {/* Top Row: Date & Action buttons */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary-700" />
                    <span className="text-sm font-extrabold text-stone-800">
                      {formatThaiDate(session.practice_date)}
                    </span>
                    {session.source === 'timer' && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                        จับเวลา
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(session)}
                      className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
                      title="แก้ไข"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSessionToDelete(session)}
                      className="p-2 text-stone-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                      title="ลบ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Middle Row: Step & Duration */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <PillBadge stepOrder={stepOrder} size="md" />
                    <div>
                      <h3 className="text-base font-bold text-stone-800 leading-tight">
                        {summary ? getPracticeSummaryDisplayName(summary) : `ขั้นตอนที่ ${stepOrder}`}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-black text-base">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span>{formatMinutesToThaiDuration(durationMins)}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Note (if any) */}
                {session.result_note && (
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-700 leading-relaxed font-medium">
                    &ldquo;{session.result_note}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(sessionToDelete)}
        onClose={() => setSessionToDelete(null)}
        title="ยืนยันการลบบันทึก"
      >
        <div className="space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-bold text-stone-800">
              ต้องการลบบันทึกนี้หรือไม่?
            </h3>
            <p className="text-stone-500 text-xs mt-1">
              เมื่อลบแล้วจะไม่สามารถกู้คืนข้อมูลนี้ได้
            </p>
          </div>

          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => setSessionToDelete(null)}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition-all"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isProcessing}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isProcessing ? 'กำลังลบ...' : 'ยืนยันลบ'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Session Modal */}
      <Modal
        isOpen={Boolean(sessionToEdit)}
        onClose={() => setSessionToEdit(null)}
        title="แก้ไขบันทึกการปฏิบัติ"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              ระยะเวลา (นาที)
            </label>
            <input
              type="number"
              min="1"
              max="1440"
              value={editMinutes}
              onChange={(e) => setEditMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 font-bold text-base outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              บันทึกผลการปฏิบัติ
            </label>
            <textarea
              rows={4}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              className="w-full p-3.5 text-sm rounded-2xl border-2 border-stone-200 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 outline-none transition-all resize-none"
            />
          </div>

          <div className="pt-2 grid grid-cols-2 gap-3">
            <button
              onClick={() => setSessionToEdit(null)}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition-all"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isProcessing}
              className="min-h-[48px] px-4 py-2.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isProcessing ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
