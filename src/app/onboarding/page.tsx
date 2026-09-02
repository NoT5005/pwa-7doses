'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/supabase/store';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, updateProfileName } = useStore();
  const [name, setName] = useState(profile?.practitioner_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    await updateProfileName(name.trim());
    setIsSubmitting(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-elevated border border-stone-200">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold text-center text-stone-800 mb-2">
          ยินดีต้อนรับสู่ 7Doses
        </h1>
        <p className="text-center text-stone-600 text-sm mb-6 leading-relaxed">
          กรุณาระบุชื่อผู้ปฏิบัติ เพื่อใช้แสดงผลในบันทึกและสถิติการปฏิบัติธรรม
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              ชื่อผู้ปฏิบัติ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น คุณสมชาย หรือ โยมอารีย์"
              className="w-full min-h-[50px] px-4 py-3 text-base rounded-2xl border-2 border-stone-200 focus:border-primary-600 focus:ring-4 focus:ring-primary-100 outline-none transition-all"
              autoFocus
            />
            <p className="text-xs text-stone-400 mt-2">
              * สามารถแก้ไขชื่อนี้ได้ตลอดเวลาในหน้าตั้งค่า
            </p>
          </div>

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full min-h-[52px] mt-4 px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base shadow-md transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>เริ่มใช้งาน</span>
          </button>
        </form>
      </div>
    </div>
  );
}
