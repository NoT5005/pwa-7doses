'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/supabase/store';
import { ArrowLeft, Save, User, CheckCircle2 } from 'lucide-react';

export default function ProfileSettingsPage() {
  const router = useRouter();
  const { profile, updateProfileName } = useStore();
  const [name, setName] = useState(profile?.practitioner_name || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    await updateProfileName(name.trim());
    setIsSubmitting(false);
    setSuccessMsg(true);
    setTimeout(() => {
      setSuccessMsg(false);
      router.push('/settings');
    }, 1200);
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
          โปรไฟล์
        </span>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-soft border border-stone-200/80">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mb-4">
          <User className="w-7 h-7" />
        </div>

        <h1 className="text-2xl font-bold text-stone-800 tracking-tight mb-1">
          ข้อมูลผู้ปฏิบัติธรรม
        </h1>
        <p className="text-stone-500 text-sm mb-6">
          แก้ไขชื่อที่จะปรากฏในแอปพลิเคชันและการแสดงผลสถิติต่างๆ
        </p>

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">
              ชื่อผู้ปฏิบัติ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ระบุชื่อผู้ปฏิบัติ"
              className="w-full min-h-[52px] px-4 py-3 text-base rounded-2xl bg-stone-50 border-2 border-stone-200 text-stone-800 focus:outline-none focus:border-primary-600 focus:ring-4 focus:ring-primary-100"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1.5">
              อีเมลผู้ใช้งาน
            </label>
            <input
              type="text"
              disabled
              value={profile?.email || 'บัญชีออฟไลน์ในเครื่อง (Local Storage)'}
              className="w-full min-h-[50px] px-4 py-3 text-sm rounded-2xl bg-stone-100 border border-stone-200 text-stone-500 cursor-not-allowed"
            />
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="w-full min-h-[52px] px-6 py-3.5 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-base shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
