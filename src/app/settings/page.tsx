'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useStore } from '@/lib/supabase/store';
import {
  User,
  Sliders,
  Smartphone,
  Info,
  LogOut,
  ChevronRight,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function SettingsPage() {
  const { profile, signOut, isOnlineBackend } = useStore();

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-stone-800 tracking-tight">
          ตั้งค่าระบบ
        </h1>
        <p className="text-xs text-stone-500 font-medium mt-0.5">
          จัดการข้อมูลส่วนตัว เกณฑ์ประเมิน และการใช้งาน PWA
        </p>
      </div>

      {/* User Info Card */}
      <div className="p-5 bg-white rounded-3xl border border-stone-200/80 shadow-soft flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xl flex-shrink-0">
          <User className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-extrabold text-stone-800 truncate">
            {profile?.practitioner_name || 'ผู้ปฏิบัติธรรม'}
          </h2>
          <p className="text-xs text-stone-400 truncate">
            {profile?.email || (isOnlineBackend ? 'เชื่อมต่อ Supabase แล้ว' : 'โหมดบันทึกในเครื่อง (Offline Ready)')}
          </p>
        </div>
        <Link
          href="/settings/profile"
          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
        >
          แก้ไข
        </Link>
      </div>

      {/* Settings Navigation Menu */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-soft divide-y divide-stone-100 overflow-hidden">
        <Link
          href="/settings/profile"
          className="p-4.5 flex items-center justify-between hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-stone-800 block">
                ข้อมูลผู้ปฏิบัติธรรม
              </span>
              <span className="text-xs text-stone-500">
                แก้ไขชื่อผู้ปฏิบัติ และข้อมูลบัญชี
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400" />
        </Link>

        <Link
          href="/settings/effort"
          className="p-4.5 flex items-center justify-between hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-stone-800 block">
                เกณฑ์ประเมินความเพียร
              </span>
              <span className="text-xs text-stone-500">
                ปรับเกณฑ์จำนวนวัน นาทีเฉลี่ย และสัดส่วนน้ำหนักคะแนน
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-stone-400" />
        </Link>
      </div>

      {/* PWA & iPhone Instructions Card */}
      <div className="p-5 bg-gradient-to-br from-white to-primary-50/40 rounded-3xl border border-primary-100 shadow-soft space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-800 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-stone-800">
            วิธีติดตั้งลงบนหน้าจอหลัก (iPhone / Android)
          </h3>
        </div>

        <div className="text-xs text-stone-600 space-y-2 leading-relaxed bg-white/80 p-3.5 rounded-2xl border border-stone-100">
          <p className="font-semibold text-stone-800">สำหรับ iPhone (Safari):</p>
          <ol className="list-decimal pl-4 space-y-1 text-stone-600">
            <li>เปิดเว็บไซต์ในเบราว์เซอร์ <strong>Safari</strong></li>
            <li>กดปุ่ม <strong>แชร์ (Share)</strong> ที่แถบด้านล่าง (ไอคอนสี่เหลี่ยมมีลูกศรชี้ขึ้น)</li>
            <li>เลื่อนลงแล้วเลือก <strong>&quot;เพิ่มไปยังหน้าจอหลัก&quot; (Add to Home Screen)</strong></li>
            <li>กด <strong>&quot;เพิ่ม&quot; (Add)</strong> เพื่อใช้งานเสมือนแอปบนมือถือ</li>
          </ol>
        </div>
      </div>

      {/* About 7Doses Card */}
      <div className="p-5 bg-white rounded-3xl border border-stone-200/80 shadow-soft flex items-center gap-4">
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-amber-200 shadow-sm flex-shrink-0">
          <Image src="/logo.jpg" alt="7Doses Logo" fill className="object-cover" />
        </div>
        <div className="text-xs">
          <h4 className="font-bold text-stone-800">7Doses (ยา 7 เม็ด) v1.0</h4>
          <p className="text-stone-500 mt-0.5">
            บันทึกการปฏิบัติธรรม 7 ขั้นตอน เพื่อสร้างความเพียรที่มั่นคงและเจริญในธรรม
          </p>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <button
          onClick={signOut}
          className="w-full min-h-[50px] px-6 py-3 rounded-2xl bg-white hover:bg-stone-100 text-rose-600 font-bold text-sm border border-stone-200 shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </div>
  );
}
