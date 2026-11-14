'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/supabase/store';
import { APP_VERSION } from '@/lib/version';
import {
  User,
  Sliders,
  Smartphone,
  LogOut,
  ChevronRight,
  Cloud,
  CloudOff,
  RefreshCw,
  UploadCloud,
  CheckCircle2,
  LogIn,
} from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const {
    user,
    profile,
    signOut,
    isDemoMode,
    isSyncing,
    lastSyncedAt,
    syncData,
    hasLocalUnsyncedData,
    importLocalDataToCloud,
  } = useStore();

  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleImportLocal = async () => {
    setImporting(true);
    const count = await importLocalDataToCloud();
    setImportedCount(count);
    setImporting(false);
  };

  return (
    <div className="space-y-5 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-800 tracking-tight">
            ตั้งค่าระบบ
          </h1>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            จัดการข้อมูลส่วนตัว การซิงค์ข้อมูล และเกณฑ์ประเมินความเพียร
          </p>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
          v{APP_VERSION}
        </span>
      </div>

      {/* User Info & Sync Status Card */}
      <div className="p-5 bg-white rounded-3xl border border-stone-200/80 shadow-soft space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xl flex-shrink-0">
            <User className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold text-stone-800 truncate">
              {profile?.practitioner_name || 'ผู้ปฏิบัติธรรม'}
            </h2>
            <p className="text-xs text-stone-500 truncate">
              {!isDemoMode
                ? user?.email || profile?.email || 'เชื่อมต่อบัญชี Google แล้ว'
                : 'โหมดบันทึกเฉพาะในเครื่องนี้ (ไม่ได้ซิงค์ข้ามเครื่อง)'}
            </p>
          </div>
          <Link
            href="/settings/profile"
            className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors"
          >
            แก้ไขชื่อ
          </Link>
        </div>

        {/* Cloud Sync Bar */}
        {!isDemoMode ? (
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Cloud className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div className="text-xs min-w-0">
                <p className="font-bold text-emerald-900">ซิงค์ข้อมูลออนไลน์กับ Google แล้ว</p>
                <p className="text-emerald-700 truncate">
                  {lastSyncedAt
                    ? `อัปเดตล่าสุด ${new Date(lastSyncedAt).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} น.`
                    : 'ข้อมูลซิงค์อัตโนมัติทุกอุปกรณ์'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={syncData}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 shadow-sm flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-60 flex-shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ตอนนี้'}</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <CloudOff className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-900">
                  ขณะนี้ใช้งานแบบออฟไลน์เฉพาะในเครื่องนี้
                </p>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  หากต้องการให้ข้อมูลซิงค์ตรงกันในโทรศัพท์หลายเครื่อง กรุณาเข้าสู่ระบบด้วยบัญชี Google เดียวกันทั้ง 2 เครื่อง
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              <span>ไปหน้าเข้าสู่ระบบด้วย Google</span>
            </button>
          </div>
        )}

        {/* Import Previous Local Data Card */}
        {!isDemoMode && hasLocalUnsyncedData && (
          <div className="p-4 rounded-2xl bg-primary-50/80 border border-primary-200 space-y-3">
            <div className="flex items-start gap-2.5">
              <UploadCloud className="w-5 h-5 text-primary-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-primary-900">
                  พบประวัติการปฏิบัติเดิมที่บันทึกไว้ในเครื่องนี้
                </p>
                <p className="text-primary-800 mt-0.5 leading-relaxed">
                  ท่านสามารถนำเข้าข้อมูลเดิมจากในเครื่องนี้ขึ้นบัญชี Google เพื่อให้แสดงผลตรงกันทุกเครื่องได้ทันที
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleImportLocal}
              disabled={importing}
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>
                {importing ? 'กำลังนำเข้าข้อมูลขึ้นระบบ Cloud...' : 'นำเข้าข้อมูลในเครื่องขึ้นบัญชี Google'}
              </span>
            </button>
          </div>
        )}

        {importedCount !== null && importedCount > 0 && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>นำเข้าข้อมูลการปฏิบัติ {importedCount} รายการขึ้นบัญชี Google เรียบร้อยแล้ว</span>
          </div>
        )}
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

      {/* PWA & Mobile Instructions Card */}
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
            <li>กด <strong>&quot;เพิ่ม&quot; (Add)</strong> แล้วเข้าสู่ระบบด้วย Google ในตัวแอป</li>
          </ol>
        </div>
      </div>

      {/* About 7Doses Card with System Version */}
      <div className="p-5 bg-white rounded-3xl border border-stone-200/80 shadow-soft flex items-center gap-4">
        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border border-amber-200 shadow-sm flex-shrink-0">
          <Image src="/logo.jpg" alt="7Doses Logo" fill className="object-cover" />
        </div>
        <div className="text-xs flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-stone-800">7Doses (ยา 7 เม็ด)</h4>
            <span className="font-bold text-primary-700 bg-primary-50 px-2.5 py-0.5 rounded-full border border-primary-200">
              Version {APP_VERSION}
            </span>
          </div>
          <p className="text-stone-500 mt-1">
            บันทึกการปฏิบัติธรรม 7 ขั้นตอน เพื่อสร้างความเพียรที่มั่นคงและเจริญในธรรม
          </p>
        </div>
      </div>

      {/* Sign Out Button */}
      <div className="pt-2">
        <button
          onClick={handleSignOut}
          className="w-full min-h-[50px] px-6 py-3 rounded-2xl bg-white hover:bg-stone-100 text-rose-600 font-bold text-sm border border-stone-200 shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </div>
  );
}
