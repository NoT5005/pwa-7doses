'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function handleCallback() {
      try {
        if (supabase) {
          const params = new URLSearchParams(window.location.search);
          const code = params.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          } else {
            await supabase.auth.getSession();
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
      } finally {
        if (mounted) {
          router.replace('/dashboard');
        }
      }
    }

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
      <p className="text-base font-bold text-stone-700">กำลังเชื่อมต่อบัญชี Google...</p>
      <p className="text-xs text-stone-500 mt-1">กรุณารอสักครู่ ระบบกำลังซิงค์ข้อมูลการปฏิบัติของท่าน</p>
    </div>
  );
}
