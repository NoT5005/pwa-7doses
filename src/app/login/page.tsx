'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/supabase/store';
import { APP_VERSION } from '@/lib/version';
import { ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, isLoading, signInWithGoogle, enterDemoMode, isOnlineBackend } = useStore();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    if (!isOnlineBackend) {
      setErrorMsg(
        'ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล (NEXT_PUBLIC_SUPABASE_URL) บนเซิร์ฟเวอร์ กรุณาตรวจสอบ Environment Variables หรือเลือกโหมดออฟไลน์'
      );
      return;
    }

    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
      setErrorMsg('ไม่สามารถเข้าสู่ระบบด้วย Google ได้ กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    enterDemoMode();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 py-8">
      {/* Brand Hero */}
      <div className="relative w-28 h-28 mb-6 rounded-3xl overflow-hidden shadow-elevated border-2 border-amber-200/80 bg-white">
        <Image
          src="/logo.jpg"
          alt="7Doses Logo"
          fill
          className="object-cover"
          priority
        />
      </div>

      <h1 className="text-3xl font-extrabold text-stone-800 tracking-tight mb-2">
        บันทึกการปฏิบัติธรรม
      </h1>
      <p className="text-lg text-primary-700 font-semibold mb-1">
        7Doses (ยา 7 เม็ด)
      </p>
      <p className="text-stone-500 text-sm max-w-sm mb-8 leading-relaxed">
        เข้าสู่ระบบด้วยบัญชี Google เพื่อบันทึกและซิงค์ข้อมูลการปฏิบัติธรรมข้ามอุปกรณ์อย่างต่อเนื่อง
      </p>

      {errorMsg && (
        <div className="w-full max-w-xs mb-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-left flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full min-h-[54px] px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-50 text-stone-800 font-bold border-2 border-stone-200 shadow-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{loading ? 'กำลังเปิดหน้า Google...' : 'เข้าสู่ระบบด้วย Google'}</span>
        </button>

        <button
          onClick={handleDemoMode}
          className="w-full min-h-[48px] px-6 py-2.5 rounded-2xl bg-primary-50 hover:bg-primary-100 text-primary-800 font-semibold text-sm border border-primary-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <span>ทดลองใช้งานเฉพาะในเครื่อง (ออฟไลน์)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Footer & Version */}
      <div className="mt-12 space-y-1 text-xs text-stone-400">
        <p>พัฒนาขึ้นเพื่อความสงบแห่งจิตใจและความเพียรอันบริสุทธิ์</p>
        <p className="font-semibold text-stone-400/90">Version {APP_VERSION}</p>
      </div>
    </div>
  );
}
